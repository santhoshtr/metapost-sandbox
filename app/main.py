import subprocess
import boto3
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import json
import uuid

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

S3_BUCKET_NAME = 'your-s3-bucket-name'

def get_unique_file_name():
    return uuid.uuid4().urn[9:15]

@app.get("/", response_class=HTMLResponse)
async def read_item(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post('/api/compile')
async def compile(request: Request):
    request_obj = await request.json()
    id = get_unique_file_name()
    mp_code = request_obj["code"]
    with open(os.path.join("/tmp", id+".mp"), "w") as file_object:
        file_object.write(mp_code)
        file_object.close()
    cmd = f"cd /tmp && mpost -s 'outputformat=\"svg\"' -s 'outputtemplate=\"{id}.svg\"' {id}.mp"
    process = subprocess.Popen([cmd], shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        return Response(content=json.dumps({
             "stderr": str(stdout),
        }), media_type="application/json", status_code=400)

    with open(os.path.join("/tmp", id+".svg"), "r") as svg_file_object:
        svgcontent = svg_file_object.read()

    responsejson:dict = json.dumps({
        "id": id,
        "svg": svgcontent,
        "stdout": str(stdout),
        "stderr": str(stderr),
    })
    # Remove the temporary files
    os.remove(os.path.join("/tmp", id+".mp"))
    os.remove(os.path.join("/tmp", id+".svg"))
    os.remove(os.path.join("/tmp", id+".log"))
    response = Response(content=responsejson, media_type="application/json")
    return response

@app.post('/api/save')
async def save(request: Request):
    request_obj = await request.json()
    svg_data = subprocess.check_output(['mpost', '-', '-svg'], input=request_obj.code)

    s3 = boto3.resource('s3')
    s3_key = 'your-folder-name/' + 'file_name.svg'

    s3.Bucket(S3_BUCKET_NAME).put_object(Key=s3_key, Body=svg_data, ContentType='image/svg+xml')
    s3.Bucket(S3_BUCKET_NAME).put_object(Key=s3_key.replace('svg', 'txt'), Body=mp_code, ContentType='text/plain')

    return Response(status_code=200, content='File saved successfully.')

