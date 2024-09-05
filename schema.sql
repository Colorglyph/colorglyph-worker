DROP TABLE IF EXISTS Colors;
DROP TABLE IF EXISTS Glyphs;
DROP TABLE IF EXISTS Offers;

-- TODO write indexes once we know what we're querying for

CREATE TABLE IF NOT EXISTS Colors (
    "Owner" TEXT NOT NULL,
    Miner TEXT NOT NULL,
    Color INTEGER NOT NULL,
    Amount INTEGER,
    UNIQUE("Owner", Miner, Color)
);

CREATE TABLE IF NOT EXISTS Glyphs (
    "Hash" TEXT PRIMARY KEY,
    "Owner" TEXT,
    Minter TEXT,
    Width INTEGER,
    "Length" INTEGER,
    Fee INTEGER,
    Id TEXT
);

CREATE TABLE IF NOT EXISTS Offers (
    Seller TEXT NOT NULL,
    Selling TEXT NOT NULL,
    Buying TEXT NOT NULL,
    Amount INTEGER NOT NULL DEFAULT 0,
    UNIQUE(Seller, Selling, Buying, Amount)
);