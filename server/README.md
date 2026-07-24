We are using **Python 3.11** inside a **Docker** container to ensure every team member develops and runs the project in the same environment with identical Python and package versions.


## Build image:
`docker build -t server .`

only rebuild when:

    you change the Dockerfile
    you change requirements.txt

## Start a development container:
Instead of running the app directly, open a shell inside the container:

`
docker run --rm -it \
-p 8000:8000 \
-v "$(pwd):/server" \
server bash
`

## Run server:

`uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

## Installing new packages:

`pip install ultralytics`

Then save them:

`pip freeze > requirements.txt`

Then exit from container and rebuild the image:

`docker build -t server .`


## Packages installed (please update it if you install any other package):
- fastapi
- uvicorn[standard]
- sqlalchemy
- pydantic-settings
- psycopg[binary]