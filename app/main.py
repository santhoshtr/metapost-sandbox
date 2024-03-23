import subprocess
from fastapi import FastAPI, Request, Response, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .mpostdb import get_db, Sample, SampleModel
from sqlalchemy.orm import Session
import os
import json
import uuid
import shlex
import shutil
import tempfile
from pydantic import parse_obj_as

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

PLACEHOLDER = """
beginfig(0);
width:=100;
rotation:=45;

pen calligraphicpen ;
calligraphicpen := makepen ((0, 0)--(width,0 ) rotated rotation) ;

z0 = (x1+150, 0);
z1 = (0, y0+250);
z2 = (x1+250, y1+250);
z3 = (x2+250, y1);
z4 = (x2, y0);
pickup calligraphicpen;
draw z0..z1..z2..z3..z4 withcolor white;
endfig;
end
"""

def get_unique_file_name():
    return uuid.uuid4().urn[9:15]

def remove_temp_files(id:str):
    temp_dir: str = tempfile.gettempdir()
    # Remove the temporary files
    extensions: list = [".mp", ".svg", ".log"]
    for ext in extensions:
        file_path = os.path.join(temp_dir, id + ext)
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/", response_class=HTMLResponse)
async def root_view(request: Request):
    context={
            "request": request,
            "name":"Untitled Metapost Sample",
            "code": PLACEHOLDER
    }
    return templates.TemplateResponse("index.html", context=context)

@app.get("/{sample_id}", response_class=HTMLResponse)
async def sample_view(sample_id: str, request: Request,  db: Session = Depends(get_db)):
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if sample:
        context = {"request": request,
            "id":sample.id, "name":sample.name, "code": sample.code
            }
    else:
        context= {
            "request": request
        }
    return templates.TemplateResponse("index.html", context=context)

# Insert or update a sample
@app.post("/api/samples")
def create_sample(sample: SampleModel, db: Session = Depends(get_db))->SampleModel:
    existing_sample = db.query(Sample).filter(Sample.id == sample.id).first()
    if not existing_sample:
        new_sample=Sample()
        new_sample.id = sample.id
        new_sample.name = sample.name
        new_sample.code = sample.code
        db.add(new_sample)
    else:
        existing_sample.name = sample.name
        existing_sample.code = sample.code

    db.commit()
    return SampleModel(id=sample.id, name=sample.name, code=sample.code)

@app.get("/api/samples/{sample_id}")
def read_sample(sample_id: str, db: Session = Depends(get_db))->SampleModel:
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        return {"error": "Sample not found"}
    return SampleModel(id=sample.id, name=sample.name, code=sample.code)


@app.post("/api/compile")
async def compile(request: Request) -> Response:
    request_obj: dict = await request.json()
    temp_dir: str = tempfile.gettempdir()
    id: str = get_unique_file_name()
    mp_code: str = request_obj["code"]

    if not mp_code.strip().endswith("end"):
        mp_code += "\nend\n"

    if "plain_ex" in mp_code:
        shutil.copyfile(os.path.join('static', 'plain_ex.mp'),
                        os.path.join(temp_dir, 'plain_ex.mp'))

    with open(os.path.join(temp_dir, id + ".mp"), "w") as file_object:
        file_object.write(mp_code)
        file_object.close()
    command_line: str = (
        f"/usr/bin/mpost -s 'outputformat=\"svg\"' -s 'outputtemplate=\"{id}.svg\"' {id}.mp"
    )
    cmd: list = shlex.split(command_line)
    process: subprocess.Popen = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=temp_dir,
    )
    stdout: bytes
    stderr: bytes
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        remove_temp_files(id)
        return Response(
            content=json.dumps(
                {
                    "stdout": stdout.decode("utf-8"),
                    "stderr": stderr.decode("utf-8"),
                }
            ),
            media_type="application/json",
            status_code=400,
        )

    with open(os.path.join(temp_dir, id + ".svg"), "r") as svg_file_object:
        svgcontent: str = svg_file_object.read()

    remove_temp_files(id)
    responsejson: dict = json.dumps(
        {
            "id": id,
            "svg": svgcontent,
            "stdout": stdout.decode("utf-8"),
            "stderr": stderr.decode("utf-8"),
        }
    )


    response: Response = Response(content=responsejson, media_type="application/json")
    return response

