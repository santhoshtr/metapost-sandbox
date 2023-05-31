# Metapost Sandbox

Try [Metapost](https://tug.org/metapost.html) quickly and easily with our online sandbox application! View and preview your results in a user-friendly interface. Perfect for anyone wanting to experiment with Metapost without the hassle of setting up an environment. Start creating illustrations now!

[Try now!](https://mpost.thottingal.in/)

## Usage

### Installation

Clone the repository. Install the system dependencies:

```bash
sudo apt install wget unzip build-essential cmake texlive-metapost
```

Create a python virtual environment and install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run it:

```bash
uvicorn app.main:app
```

## Features

* Code editor with syntax highlighting for Metapost
* Live preview of the SVG generated from the code. No need to manually run it
* Logs of compiling the code from metapost is available for debugging.
* (todo) Saving the code in browser indexdb to continue from where you stopped.

## Familiarize with Metafont, MetaPost

Familiarizing with the concepts of MetaFont and MetaPost are essential. In this guide, we are not going to explain this, but will provide a list of good tutorials to use.

* The MetaFont book by Knuth is the ultimate resource for learning MetaFont concepts. There are [ebook versions available in internet](https://www.google.com/search?q=metafont+book), but they don't have illustrations. It is recommended to have a printed copy of this book.
* John D. Hobby. [A METAFONT-like System with PostScript Output](http://www.tug.org/TUGboat/Articles/tb10-4/tb26hobby.pdf). TUGboat, 10(4), 1989.
* John D. Hobby. [METAPOST — A User’s Manual](http://www.tug.org/docs/metapost/mpman.pdf.), 2008.
* [Learning METAPOST by Doing](https://staff.fnwi.uva.nl/a.j.p.heck/Courses/mptut.pdf)
* [MetaPost for Beginners](https://meeting.contextgarden.net/2008/talks/2008-08-22-hartmut-metapost/mptut-context2008.pdf)

It is important to practice MetaPost rather than just reading the book. Use this sandbox tool for practicing.

## Docker

```bash
docker build -t mpostsandbox .
docker run -d --name mpostsandboxcontainer -p 80:80 mpostsandbox
```
