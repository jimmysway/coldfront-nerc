# This Dockerfile uses a multi-stage build
# * The builder image installs the compile time dependencies and
#   installs the pip packages into a virtual environment.
# * The final image copies the virtual environment over and
#   installs netcat and mysql libraries as runtime deps.

# Builder Image
FROM python:3.12-slim-bullseye as builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        default-libmysqlclient-dev \
        libpq-dev \
        git \
        pkg-config && \
    apt-get clean -y

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt /tmp/requirements.txt
RUN pip3 install -r /tmp/requirements.txt

COPY patches/01_add_api_urls.patch /opt/venv/lib/python3.12/site-packages/
COPY patches/03_add_active_needs_renewal_status.patch /opt/venv/lib/python3.12/site-packages/
COPY patches/04_add_usage_chart.patch /opt/venv/lib/python3.12/site-packages/

RUN cd /opt/venv/lib/python3.12/site-packages && \
    patch -p1 < 01_add_api_urls.patch && \
    patch -p1 < 03_add_active_needs_renewal_status.patch && \
    patch -p1 < 04_add_usage_chart.patch

# Final Image
FROM python:3.12-slim-bullseye

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        netcat libmariadb3 libpq5 && \
    apt-get clean -y

COPY --from=builder --chown=1001:0 /opt/venv /opt/venv
COPY src/local_settings.py /opt/venv/lib/python3.12/site-packages

COPY src/bin/run_coldfront.sh /opt/venv/bin

# Update NERC's email templates
COPY src/email/ /opt/venv/lib/python3.12/site-packages/coldfront/templates/email/

# Add NERC usage chart static files
COPY src/static/chartjs/ /opt/venv/lib/python3.12/site-packages/coldfront/static/chartjs/
COPY src/static/css/ /opt/venv/lib/python3.12/site-packages/coldfront/static/css/
COPY src/static/js/ /opt/venv/lib/python3.12/site-packages/coldfront/static/js/

ENV PATH="/opt/venv/bin:$PATH"
ENV DJANGO_SETTINGS_MODULE="local_settings"

EXPOSE 8080

USER 1001

CMD [ "run_coldfront.sh" ]
