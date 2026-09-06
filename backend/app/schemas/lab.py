from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class IdentifierInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    identifier_type: Literal["aadhaar", "abha", "email", "phone"]
    identifier: str = Field(min_length=1, max_length=254)


class LabDemographics(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    full_name: str = Field(min_length=2, max_length=100)
    date_of_birth: date
    gender: Literal["Male", "Female", "Other", "Prefer not to say"]
    address: str = Field(default="", max_length=500)
    mobile: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)

    @model_validator(mode="after")
    def valid_birth_date(self):
        if self.date_of_birth > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return self


class LabRegistration(IdentifierInput, LabDemographics):
    pass


class LabVerification(LabDemographics):
    details_confirmed: Literal[True]
    processing_consent: Literal[True]
