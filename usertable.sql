CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    pwdhash TEXT NOT NULL,
    email TEXT NOT NULL,
    karma INT,
    address TEXT
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    originId INT NOT NULL,
    destId INT NOT NULL,
    message TEXT NOT NULL
);