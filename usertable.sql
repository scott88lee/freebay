CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    pwdhash TEXT NOT NULL,
    email TEXT NOT NULL,
    karma INT,
    address TEXT
);

CREATE TABLE messages (
    messageid SERIAL PRIMARY KEY,
    originId INT NOT NULL,
    destId INT NOT NULL,
    subject VARCHAR(55),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL
);

CREATE TABLE items (
    itemid SERIAL PRIMARY KEY,
    itemname VARCHAR(255) NOT NULL,
    description TEXT,
    imglink VARCHAR(255),
    ownerid INT,
    shipping TEXT
);

SELECT * FROM users U INNER JOIN messages M ON U.id = M.destid;

SELECT * FROM users INNER JOIN messages ON users.id = messages.destid;

SELECT
    U.*,
    M.originid,
    UN.firstname,
    M.message
FROM users U
INNER JOIN messages M ON U.id = M.destid
INNER JOIN users UN ON M.originid = UN.id
WHERE U.id = 1;