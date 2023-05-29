# Metapost Sandbox

## Usage

### Installation

Clone the repository. Install the system dependencies:

```bash
sudo apt install wget unzip build-essential cmake
```

Create a python virtual environment and install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Docker

docker build -t mpostsandbox .
docker run -d --name mpostsandboxcontainer -p 80:80 mpostsandbox
