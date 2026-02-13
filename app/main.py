import subprocess
from typing import List
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
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
    id: str
    error: int = 0
    stdout: str = None
    stderr: str = None
    svg: str = None


@dataclass
class MetapostSample:
    id: str
    author: str
    title: str
    metapost: str
    created: str
    updated: str
    svg: str = None


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


def remove_temp_files(id: str):
    temp_dir: str = tempfile.gettempdir()
    # Remove the temporary files
    extensions: list = [".mp", ".svg", ".log"]
    for ext in extensions:
        file_path = os.path.join(temp_dir, id + ext)
        if os.path.exists(file_path):
            os.remove(file_path)


def mpost(mp_code: str) -> MetapostResponse:
    id: str = get_unique_file_name()
    temp_dir: str = tempfile.gettempdir()
    if not mp_code.strip().endswith("end"):
        mp_code += "\nend\n"

    if "plain_ex" in mp_code:
        shutil.copyfile(
            os.path.join("static", "plain_ex.mp"), os.path.join(temp_dir, "plain_ex.mp")
        )

    with open(os.path.join(temp_dir, id + ".mp"), "w") as file_object:
        file_object.write(mp_code)
        file_object.close()
    command_line: str = f"/usr/bin/mpost -s 'outputformat=\"svg\"' -s 'outputtemplate=\"{id}.svg\"' {id}.mp"
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
    try:
        stdout, stderr = process.communicate(timeout=60)
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        remove_temp_files(id)
        return MetapostResponse(
            id=id,
            error=-1,
            stdout="",
            stderr="Compilation timeout: The process took longer than 60 seconds and was aborted.",
            svg="",
        )

    if process.returncode == 0:
        with open(os.path.join(temp_dir, id + ".svg"), "r") as svg_file_object:
            svgcontent: str = svg_file_object.read()
    else:
        svgcontent = ""
    remove_temp_files(id)
    return MetapostResponse(
        id=id,
        error=process.returncode,
        stdout=stdout.decode("utf-8"),
        stderr=stderr.decode("utf-8"),
        svg=svgcontent,
    )


@app.get("/", response_class=HTMLResponse)
async def root_view(request: Request):
    context = {
        "request": request,
        "title": "Untitled Metapost Sample",
        "metapost": PLACEHOLDER,
    }
    return templates.TemplateResponse("index.html", context=context)


@app.get("/documentation", response_class=HTMLResponse)
async def docs_view(request: Request):
    context = {
        "request": request,
    }
    return templates.TemplateResponse("documentation.html", context=context)


@app.get("/about", response_class=HTMLResponse)
async def about_view(request: Request):
    context = {
        "request": request,
    }
    return templates.TemplateResponse("about.html", context=context)


@app.post("/api/compile")
async def compile(request: Request) -> Response:
    request_obj: dict = await request.json()

    mp_code: str = request_obj["code"]

    result: MetapostResponse = mpost(mp_code)
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

    responsejson: dict = json.dumps(
        {
            "id": result.id,
            "svg": result.svg,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    )

    response: Response = Response(content=responsejson, media_type="application/json")
    return response


# GitHub OAuth and Gist endpoints
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
GITHUB_API_BASE = "https://api.github.com"


@app.post("/api/auth/github/callback")
async def github_callback(request: Request):
    """Exchange GitHub authorization code for access token"""
    try:
        data = await request.json()
        code = data.get("code")

        if not code:
            return JSONResponse(
                {"message": "Authorization code required"}, status_code=400
            )

        # Exchange code for token
        token_response = requests.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            return JSONResponse(
                {"message": "Failed to obtain access token"}, status_code=400
            )

        # Get user info
        user_response = requests.get(
            f"{GITHUB_API_BASE}/user",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if user_response.status_code != 200:
            return JSONResponse(
                {"message": "Failed to fetch user info"}, status_code=400
            )

        user_data = user_response.json()

        response = JSONResponse(
            {
                "id": user_data["id"],
                "username": user_data["login"],
                "avatar_url": user_data["avatar_url"],
            }
        )

        # Set HTTP-only cookie with token
        response.set_cookie(
            "github_token",
            access_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=86400 * 7,  # 7 days
        )

        return response

    except Exception as e:
        return JSONResponse(
            {"message": f"Authentication failed: {str(e)}"}, status_code=500
        )


@app.post("/api/auth/logout")
async def logout():
    """Clear authentication cookie"""
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("github_token")
    return response


@app.get("/m/{sample_id}", response_class=HTMLResponse)
async def sample_view(sample_id: str, request: Request):
    """View a metapost sample from GitHub Gist"""
    try:
        # Fetch from GitHub Gists API
        response = requests.get(f"{GITHUB_API_BASE}/gists/{sample_id}")

        if response.status_code == 404:
            context = {"request": request}
            return templates.TemplateResponse("index.html", context=context)

        if response.status_code != 200:
            context = {"request": request}
            return templates.TemplateResponse("index.html", context=context)

        gist = response.json()

        # Extract data from gist
        description = gist.get("description", "")
        title = (
            description.replace("#metapost-sandbox", "").strip()
            if description
            else "Untitled"
        )

        main_file = gist.get("files", {}).get("main.mp", {})
        code = main_file.get("content", "")

        context = {
            "request": request,
            "id": gist["id"],
            "title": title,
            "author": gist["owner"]["login"],
            "metapost": code,
            "created": gist["created_at"],
            "updated": gist["updated_at"],
        }
        return templates.TemplateResponse("index.html", context=context)

    except Exception:
        context = {"request": request}
        return templates.TemplateResponse("index.html", context=context)


@app.get("/m/{sample_id}/embed", response_class=HTMLResponse)
async def sample_embed_view(sample_id: str, request: Request):
    """Embed view of a metapost sample from GitHub Gist"""
    try:
        response = requests.get(f"{GITHUB_API_BASE}/gists/{sample_id}")

        if response.status_code != 200:
            context = {"request": request}
            return templates.TemplateResponse("embed.html", context=context)

        gist = response.json()

        description = gist.get("description", "")
        title = (
            description.replace("#metapost-sandbox", "").strip()
            if description
            else "Untitled"
        )

        main_file = gist.get("files", {}).get("main.mp", {})
        code = main_file.get("content", "")

        # Compile the metapost code
        result = mpost(code)
        svg = result.svg if result.error == 0 else None

        context = {
            "request": request,
            "id": gist["id"],
            "title": title,
            "metapost": code,
            "created": gist["created_at"],
            "updated": gist["updated_at"],
            "svg": svg,
        }
        return templates.TemplateResponse("embed.html", context=context)

    except Exception:
        context = {"request": request}
        return templates.TemplateResponse("embed.html", context=context)


@app.get("/u/{username}", response_class=HTMLResponse)
async def user_view(username: str, request: Request):
    """View user's metapost gists"""
    try:
        # Fetch user's gists from GitHub
        response = requests.get(
            f"{GITHUB_API_BASE}/users/{username}/gists?per_page=100"
        )

        if response.status_code != 200:
            context = {"request": request, "records": []}
            return templates.TemplateResponse("user.html", context=context)

        gists = response.json()
        records: List[MetapostSample] = []

        for gist in gists:
            description = gist.get("description", "")
            if "#metapost-sandbox" not in description:
                continue

            title = (
                description.replace("#metapost-sandbox", "").strip()
                if description
                else "Untitled"
            )

            main_file = gist.get("files", {}).get("main.mp", {})
            code = main_file.get("content", "")

            # Compile for SVG preview
            result = mpost(code)
            svg = result.svg if result.error == 0 else None

            record = MetapostSample(
                id=gist["id"],
                author=gist["owner"]["login"],
                title=title,
                metapost=code,
                created=gist["created_at"],
                updated=gist["updated_at"],
                svg=svg,
            )
            records.append(record)

        context = {"request": request, "records": records}
        return templates.TemplateResponse("user.html", context=context)

    except Exception:
        context = {"request": request, "records": []}
        return templates.TemplateResponse("user.html", context=context)
