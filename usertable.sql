CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    pwdhash TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT
);