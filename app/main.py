import subprocess
from typing import List
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic.dataclasses import dataclass
import os
import json
import uuid
import shlex
import shutil
import tempfile
import requests


@dataclass
class MetapostResponse:
    id:str
    error:int=0
    stdout:str=None
    stderr:str=None
    svg:str=None

@dataclass
class MetapostSample:
   id:str
   author:str
   title:str
   metapost:str
   created:str
   updated:str
   svg:str=None

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

def mpost(mp_code:str)->MetapostResponse:
    id: str = get_unique_file_name()
    temp_dir: str = tempfile.gettempdir()
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

    if process.returncode == 0:
        with open(os.path.join(temp_dir, id + ".svg"), "r") as svg_file_object:
            svgcontent: str = svg_file_object.read()
    else:
        svgcontent=None
    remove_temp_files(id)
    return MetapostResponse(
        id=id,
        error=process.returncode,
        stdout= stdout.decode("utf-8"),
        stderr= stderr.decode("utf-8"),
        svg=svgcontent
    )

@app.get("/", response_class=HTMLResponse)
async def root_view(request: Request):
    context={
            "request": request,
            "title":"Untitled Metapost Sample",
            "metapost": PLACEHOLDER
    }
    return templates.TemplateResponse("index.html", context=context)

@app.get("/m/{sample_id}", response_class=HTMLResponse)
async def sample_view(sample_id: str, request: Request):
    url = f"https://santhosh.pockethost.io/api/collections/metaposts/records/{sample_id}"
    headers = {
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)
    sample=None
    if response.status_code == 200:
        sample = response.json()
        context = {
            "request": request,
            "id":sample["id"],
            "title":sample["title"],
            "author": sample["author"],
            "metapost": sample["metapost"],
            "created": sample["created"],
            "updated": sample["updated"],
        }
    else:
        context= {
            "request": request
        }
    return templates.TemplateResponse("index.html", context=context)

@app.get("/m/{sample_id}/embed", response_class=HTMLResponse)
async def sample_view(sample_id: str, request: Request):
    url = f"https://santhosh.pockethost.io/api/collections/metaposts/records/{sample_id}"
    headers = {
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)
    sample=None
    if response.status_code == 200:
        sample = response.json()
        result:MetapostResponse = mpost(sample["metapost"])
        svg = None
        if result.error == 0:
            svg = result.svg

        context = {
            "request": request,
            "id":sample["id"],
            "title":sample["title"],
            "metapost": sample["metapost"],
            "created": sample["created"],
            "updated": sample["updated"],
            "svg": svg
        }
    else:
        context= {
            "request": request
        }
    return templates.TemplateResponse("embed.html", context=context)



@app.get("/u/{username}", response_class=HTMLResponse)
async def user_view(username: str, request: Request):
    url = f"https://santhosh.pockethost.io/api/collections/metaposts/records?filter=(author.username='{username}')"
    headers = {
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        samples = response.json()
        records:List[MetapostSample]=[]
        for sample in samples["items"]:
            result:MetapostResponse = mpost(sample["metapost"])
            svg = None
            if result.error == 0:
                svg = result.svg
            record = MetapostSample(
                id=sample["id"],
                author=sample["author"],
                title=sample["title"],
                metapost=sample["metapost"],
                created=sample["created"],
                updated=sample["updated"],
                svg=svg
            )
            records.append(record)

        context = {
            "request": request,
            "records": records
        }
    else:
        context= {
            "request": request
        }
    return templates.TemplateResponse("user.html", context=context)

@app.post("/api/compile")
async def compile(request: Request) -> Response:
    request_obj: dict = await request.json()


    mp_code: str = request_obj["code"]

    result:MetapostResponse = mpost(mp_code)
    if result.error != 0:
        return Response(
            content=json.dumps(
                {
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
            ),
            media_type="application/json",
            status_code=400,
        )

    responsejson: dict = json.dumps({
            "id": result.id,
            "svg": result.svg,
            "stdout": result.stdout,
            "stderr": result.stderr,
        })

    response: Response = Response(content=responsejson, media_type="application/json")
    return response

