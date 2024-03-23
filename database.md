
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
  id VARCHAR(256) PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  code TEXT NOT NULL
);

GRANT ALL PRIVILEGES ON TABLE samples TO mpostuser;
```
