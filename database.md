
Create the database first

```bash
sudo -u postgres psql
```

Then,

```
create database mpostsandbox
create user mpostuser with encrypted password 'mpostpassword';
grant all privileges on database mpostsandbox to mpostuser;
```

Create the tables

```sql
DROP TABLE samples;
CREATE TABLE samples (
  id SERIAL,
  name VARCHAR(256) NOT NULL,
  code TEXT NOT NULL
);

ALTER SEQUENCE samples_id_seq RESTART WITH 100000 INCREMENT BY 1;

GRANT ALL PRIVILEGES ON TABLE samples TO mpostuser;
GRANT ALL PRIVILEGES ON SEQUENCE samples_id_seq TO mpostuser;
```
