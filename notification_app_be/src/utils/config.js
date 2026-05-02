const BASE_URL = "http://20.207.122.201";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJwcDUwMjBAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMDQwMiwiaWF0IjoxNzc3Njk5NTAyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYTQyNmIzODYtYjQ3My00ZGJmLWExYjctYjNkNTM5ODI1NWNiIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicHJhdHl1c2ggcHJhZGhhbiIsInN1YiI6Ijc1NDE5ZDk4LTEzMmItNDY1ZS04YmFkLWEzZGZlMWM2NmI4YiJ9LCJlbWFpbCI6InBwNTAyMEBzcm1pc3QuZWR1LmluIiwibmFtZSI6InByYXR5dXNoIHByYWRoYW4iLCJyb2xsTm8iOiJyYTIzMTEwNDcwMTAwOTUiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiI3NTQxOWQ5OC0xMzJiLTQ2NWUtOGJhZC1hM2RmZTFjNjZiOGIiLCJjbGllbnRTZWNyZXQiOiJuVmRwRGFZUnhrelJVdnRxIn0.f0t6t76h-eu3VLzVxRBER7p_iZheH727vXC-dozYSTw";

const PORT = 3002;

const TYPE_IMPORTANCE = {
  result: 10,
  placement: 10,
  urgent: 10,
  exam: 10,
  academic: 9,
  alert: 8,
  assignment: 8,
  warning: 7,
  system: 6,
  reminder: 5,
  event: 5,
  update: 4,
  info: 3,
  general: 2,
  promotional: 1,
};

const DEFAULT_TYPE_WEIGHT = 3;

module.exports = {
  BASE_URL,
  ACCESS_TOKEN,
  PORT,
  TYPE_IMPORTANCE,
  DEFAULT_TYPE_WEIGHT,
};
