FROM postgres:13

ENV POSTGRES_USER=postgres_user
ENV POSTGRES_PASSWORD=postgres_password
ENV POSTGRES_DB=bakery_db

COPY init_db.sql /docker-entrypoint-initdb.d/
