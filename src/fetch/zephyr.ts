import { IRequestStrict, status } from "itty-router"
import { paletteToBase64 } from "../utils/paletteToBase64";
import { scValToNative, xdr } from "colorglyph-sdk";

// TODO block access with JWT
// TODO consider using a queue to speed up the requests

export async function zephyr(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const { seq_num, fee_charged, data: events } = await req.json() as Body;
    const statements: D1PreparedStatement[] = [];

    for (const event of events) {
        if ("Color" in event) {
            await process_color(env, event.Color, statements);
        } else if ("Glyph" in event) {
            await process_glyph(env, event.Glyph, statements, seq_num, fee_charged);
        } else if ("GlyphOwner" in event) {
            await process_glyph(env, event.GlyphOwner, statements, seq_num, fee_charged);
        } else if ("GlyphMinter" in event) {
            await process_glyph(env, event.GlyphMinter, statements, seq_num, fee_charged);
        } else if ("Offer" in event) {
            await process_offer(env, event.Offer, statements);
        } else if ("OfferSellerSelling" in event) {
            await process_offer(env, event.OfferSellerSelling, statements);
        } else if ("OfferSellingBuyingAmount" in event) {
            await process_offer(env, event.OfferSellingBuyingAmount, statements);
        }
    }

    await env.DB.batch(statements);

    return status(204)
}

async function process_color(env: Env, body: Color, statements: D1PreparedStatement[]) {
    switch (body.change) {
        case Change.Create:
        case Change.Update:
            const statement = env.DB.prepare(`
                INSERT INTO Colors ("Owner", Miner, Color, Amount)
                VALUES (?1, ?2, ?3, ?4)
                ON CONFLICT("Owner", Miner, Color)
                DO UPDATE SET 
                    Amount = CASE WHEN Amount IS NULL OR Amount <> excluded.Amount THEN excluded.Amount ELSE Amount END
            `)
                .bind(
                    body.owner,
                    body.miner,
                    body.color,
                    body.amount
                )

            statements.push(statement);
            break;
        case Change.Remove:
            console.warn("Attempt to remove a Color was ignored");
            break;
    }
}

async function process_glyph(env: Env, body: Glyph | GlyphOwner | GlyphMinter, statements: D1PreparedStatement[], seq_num: number, fee_charged: number) {
    switch (body.change) {
        case Change.Create:
        case Change.Update:
            if (isGlyph(body)) {
                // NOTE this fee statement wasn't actually accurate for tracking total glyph cost as there's color mining fees as well 
                // which aren't really possible to trace back to the glyph those colors will be used in
                // const feeStatement = env.DB.prepare(`
                //     UPDATE Glyphs
                //     SET Fee = COALESCE(Fee, 0) + ?2
                //     WHERE "Hash" = ?1 AND (Width IS NULL OR Width = 0)
                // `)
                //     .bind(body.hash, fee_charged);

                // statements.push(feeStatement);

                const scval = xdr.ScVal.fromXDR(body.colors, 'base64');
                const statement = env.DB.prepare(`
                    INSERT INTO Glyphs ("Hash", Width, "Length")
                    VALUES (?1, ?2, ?3)
                    ON CONFLICT("Hash")
                    DO UPDATE SET
                        Width = CASE WHEN Width IS NULL OR excluded.Width > Width THEN excluded.Width ELSE Width END,
                        "Length" = CASE WHEN "Length" IS NULL OR "Length" <> excluded."Length" THEN excluded."Length" ELSE "Length" END
                `)
                    .bind(
                        body.hash,
                        body.width,
                        body.length
                    )

                statements.push(statement);

                if (body.length) {
                    const image = await scval_to_image(scval, body.width, body.length);

                    await put_if_newer(env, `png:${body.hash}`, seq_num, image, {
                        contentType: 'image/png',
                    });
                }

                await put_if_newer(env, `raw:${body.hash}`, seq_num, scval.toXDR());
            }

            else if (isGlyphOwner(body)) {
                const statement = env.DB.prepare(`
                    INSERT INTO Glyphs ("Hash", "Owner")
                    VALUES (?1, ?2)
                    ON CONFLICT("Hash")
                    DO UPDATE SET
                        "Owner" = CASE WHEN "Owner" IS NULL OR "Owner" <> excluded."Owner" THEN excluded."Owner" ELSE "Owner" END
                `)
                    .bind(body.hash, body.owner)

                statements.push(statement);
            }

            else if (isGlyphMinter(body)) {
                const statement = env.DB.prepare(`
                    INSERT INTO Glyphs ("Hash", Minter)
                    VALUES (?1, ?2)
                    ON CONFLICT("Hash")
                    DO UPDATE SET
                        Minter = CASE WHEN Minter IS NULL OR Minter <> excluded.Minter THEN excluded.Minter ELSE Minter END
                `)
                    .bind(body.hash, body.minter)

                statements.push(statement);
            }
            break;
        case Change.Remove:
            console.warn("Attempt to remove a Glyph was ignored");
            break;
    }
}

async function process_offer(env: Env, body: Offer | OfferSellerSelling | OfferSellingBuyingAmount, statements: D1PreparedStatement[]) {
    switch (body.change) {
        case Change.Create:
        case Change.Update:
            if (isOffer(body)) {
                const amount = i128_to_bigint_string(body.amount);
                // TODO currently the way we track offers we do not support duplicates even though I think the protocol might allow it ?? (need to check)

                const statement = env.DB.prepare(`
                    INSERT INTO Offers (Seller, Selling, Buying, Amount)
                    VALUES (?1, ?2, ?3, ?4)
                    ON CONFLICT(Seller, Selling, Buying, Amount)
                    DO NOTHING
                `)
                    .bind(
                        body.seller,
                        body.selling,
                        body.buying,
                        amount
                    )

                statements.push(statement);
            }
            break;
        case Change.Remove:
            if (isOffer(body)) {
                const amount = i128_to_bigint_string(body.amount);

                const statement = env.DB.prepare(`
                    DELETE FROM Offers WHERE Seller = ?1 AND Selling = ?2 AND Buying = ?3 AND Amount = ?4
                `)
                    .bind(body.seller, body.selling, body.buying, amount)

                statements.push(statement);
            }

            else if (isOfferSellerSelling(body)) {
                const statement = env.DB.prepare(`
                    DELETE FROM Offers WHERE Seller = ?1 AND Selling = ?2
                `)
                    .bind(body.seller, body.selling)

                statements.push(statement);
            }

            else if (isOfferSellingBuyingAmount(body)) {
                const amount = i128_to_bigint_string(body.amount);

                const statement = env.DB.prepare(`
                    DELETE FROM Offers WHERE Selling = ?1 AND Buying = ?2 AND Amount = ?3
                `)
                    .bind(body.selling, body.buying, amount)

                statements.push(statement);
            }
            break;
    }
}

async function scval_to_image(scval: xdr.ScVal, width: number, length: number) {
    const palette: number[] = new Array(length).fill(256 ** 3 - 1);

    for (const [_, colors] of Object.entries(scValToNative(scval)) as [string, { color: number[] }][]) {
        for (const [color, indexes] of Object.entries(colors)) {
            for (const index of indexes as number[]) {
                palette.splice(index, 1, Number(color));
            }
        }
    }

    return paletteToBase64(palette, width)
}

async function put_if_newer(env: Env, key: string, seq_num: number, data: ArrayBuffer, httpMetadata?: R2HTTPMetadata) {
    const get = await env.IMAGES.head(key);
    const existing_seq_num = parseInt(get?.customMetadata?.['Last-Modified-Sequence-Number'] || '0')

    if (existing_seq_num < seq_num) {
        await env.IMAGES.put(key, data, {
            httpMetadata,
            customMetadata: {
                'Last-Modified-Sequence-Number': seq_num.toString()
            }
        })
    }
}

function i128_to_bigint_string(amount: { i128: { hi: number, lo: number } } | null): string {
    return amount !== null
        ? (BigInt(amount.i128.hi) << BigInt(64) | BigInt(amount.i128.lo)).toString()
        : '0';
}

/// --- Types ---

interface Base {
    change: Change,
}
interface BaseGlyph extends Base {
    hash: string,
}
interface BaseOffer extends Base {
    selling: string,
}
interface Color extends Base {
    miner: string,
    owner: string,
    color: number,
    amount: number,
}
interface Glyph extends BaseGlyph {
    width: number,
    length: number,
    colors: string,
}
interface GlyphOwner extends BaseGlyph {
    owner: string,
}
interface GlyphMinter extends BaseGlyph {
    minter: string,
}
interface Offer extends BaseOffer {
    seller: string,
    buying: string,
    amount: { i128: { hi: number, lo: number } } | null,
}
interface OfferSellerSelling extends BaseOffer {
    seller: string,
}
interface OfferSellingBuyingAmount extends BaseOffer {
    buying: string,
    amount: { i128: { hi: number, lo: number } } | null,
}

enum Change {
    Create = "Create",
    Update = "Update",
    Remove = "Remove"
}

type BodyMapping = {
    Color: Color;
    Glyph: Glyph;
    GlyphOwner: GlyphOwner;
    GlyphMinter: GlyphMinter;
    Offer: Offer;
    OfferSellerSelling: OfferSellerSelling;
    OfferSellingBuyingAmount: OfferSellingBuyingAmount;
};

type Body = {
    seq_num: number,
    fee_charged: number,
    data: DataObject[],
}

type DataObject = {
    [K in keyof BodyMapping]: { [key in K]: BodyMapping[K] };
}[keyof BodyMapping];

type DataValues = BodyMapping[keyof BodyMapping];

// --- Type Guards ---

function isColor(body: DataValues): body is Color {
    return 'miner' in body && 'owner' in body && 'color' in body && 'amount' in body;
}

function isGlyph(body: DataValues): body is Glyph {
    return 'hash' in body && 'width' in body && 'length' in body && 'colors' in body;
}

function isGlyphOwner(body: DataValues): body is GlyphOwner {
    return 'hash' in body && 'owner' in body;
}

function isGlyphMinter(body: DataValues): body is GlyphMinter {
    return 'hash' in body && 'minter' in body;
}

function isOffer(body: DataValues): body is Offer {
    return 'seller' in body && 'selling' in body && 'buying' in body && 'amount' in body;
}

function isOfferSellerSelling(body: DataValues): body is OfferSellerSelling {
    return 'seller' in body && 'selling' in body;
}

function isOfferSellingBuyingAmount(body: DataValues): body is OfferSellingBuyingAmount {
    return 'selling' in body && 'buying' in body && 'amount' in body;
}