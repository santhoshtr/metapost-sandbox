FROM danteev/texlive:latest

WORKDIR /srv


RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential unzip wget cmake python texlive-metapost

COPY ./pyproject.toml /srv/pyproject.toml
COPY ./app /srv/app

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --upgrade -e /srv

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]