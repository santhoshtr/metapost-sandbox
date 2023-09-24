import subprocess
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import json
import uuid
import shlex
import shutil
import tempfile

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


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
async def read_item(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


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

