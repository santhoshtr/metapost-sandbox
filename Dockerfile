FROM danteev/texlive:latest

WORKDIR /srv


RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential unzip wget cmake python

COPY ./requirements.txt /srv/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /srv/requirements.txt

COPY ./app /srv/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]