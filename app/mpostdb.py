from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from pydantic import BaseModel, Field
from typing import Optional

# Database connection details (replace with your own)
DATABASE_URL = "postgresql://mpostuser:mpostpassword@127.0.0.1:5432/mpostsandbox"

# Define SQLAlchemy models
engine = create_engine(DATABASE_URL, poolclass=NullPool)  # Avoid connection pooling issues
Base = declarative_base()

class Sample(Base):
    __tablename__ = "samples"

    id = Column(String(256), primary_key=True, nullable=False, index=True)
    name = Column(String(256), nullable=False)
    code = Column(Text, nullable=False)

class SampleModel(BaseModel):
    id: str = Field(..., max_length=256, example="name-token")
    name: str = Field(..., max_length=256, example="name")
    code: str = Field(..., example="metapost code")

# Create database tables (if not already created)
Base.metadata.create_all(bind=engine)

# Dependency function to get a database session
def get_db():
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        yield session
    finally:
        session.close()
