from pydantic import BaseModel, Field

class Department(BaseModel):
    code: str = Field(..., min_length=2, max_length=12)
    name: str = Field(..., min_length=4, max_length=64)
    no_of_semesters: int = Field(..., ge=2, le=10)
    

class CreateDepartmentRequest(BaseModel):
    departments: list[Department]

