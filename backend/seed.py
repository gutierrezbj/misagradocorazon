"""Idempotent seed data for Mi Sagrado Corazon."""
from datetime import datetime, timezone, timedelta


def now_utc():
    return datetime.now(timezone.utc)


FP = "https://commons.wikimedia.org/wiki/Special:FilePath/"
IMG = {
    "guadalupe": FP + "1531_Nuestra_Se%C3%B1ora_de_Guadalupe_anagoria.jpg?width=500",
    "miguel": FP + "Guido_Reni_031.jpg?width=500",
    "judas": FP + "San_Judas_Tadeo,_de_El_Greco_(Museo_Nacional_de_Escultura_de_Valladolid).JPG?width=500",
    "corazon": "https://images.pexels.com/photos/7219104/pexels-photo-7219104.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "antonio": FP + "Antonio_de_Pereda_y_Salgado_-_St_Anthony_of_Padua_with_Christ_Child_(detail)_-_WGA17168.jpg?width=500",
    "teresa": FP + "Teresa_de_Jes%C3%BAs_(cropped).jpg?width=500",
    "jose": FP + "William_Dyce_-_St_Joseph_-_WGA07375.jpg?width=500",
    "cause_church": "https://images.pexels.com/photos/208315/pexels-photo-208315.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "cause_water": "https://images.pexels.com/photos/60013/desert-drought-dehydrated-clay-soil-60013.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "cause_food": "https://images.pexels.com/photos/7156163/pexels-photo-7156163.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "cause_children": "https://images.pexels.com/photos/8422402/pexels-photo-8422402.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
}

SAINTS = [
    {
        "id": "saint_guadalupe",
        "name": "Virgen de Guadalupe",
        "feast_date": "12-12",
        "image_url": IMG["guadalupe"],
        "order": 1,
        "is_patron_catalog": True,
        "history": {
            "es": "La Virgen de Guadalupe se apareció a San Juan Diego en el cerro del Tepeyac en 1531, dejando su imagen milagrosa en la tilma. Es la patrona de México y de toda América, madre y consuelo del pueblo hispano.",
            "en": "Our Lady of Guadalupe appeared to Saint Juan Diego on Tepeyac hill in 1531, leaving her miraculous image on his tilma. She is the patroness of Mexico and all the Americas.",
        },
        "patronages": {"es": "México, América, los no nacidos, las familias", "en": "Mexico, the Americas, the unborn, families"},
        "prayer": {
            "es": "Santa María de Guadalupe, madre nuestra, mírame con tus ojos de misericordia y guárdame bajo tu manto. Amén.",
            "en": "Holy Mary of Guadalupe, our mother, look upon me with your merciful eyes and keep me under your mantle. Amen.",
        },
    },
    {
        "id": "saint_corazon",
        "name": "Sagrado Corazón de Jesús",
        "feast_date": "06-27",
        "image_url": IMG["corazon"],
        "order": 2,
        "is_patron_catalog": True,
        "history": {
            "es": "La devoción al Sagrado Corazón revela el amor infinito de Cristo por la humanidad. Su corazón, ardiente y coronado de espinas, es fuente de misericordia y refugio de los pecadores.",
            "en": "Devotion to the Sacred Heart reveals Christ's infinite love for humanity. His heart, burning and crowned with thorns, is a fountain of mercy and refuge for sinners.",
        },
        "patronages": {"es": "El amor de Dios, la misericordia, las familias consagradas", "en": "God's love, mercy, consecrated families"},
        "prayer": {
            "es": "Sagrado Corazón de Jesús, en Ti confío. Haz mi corazón semejante al Tuyo. Amén.",
            "en": "Sacred Heart of Jesus, I trust in You. Make my heart like unto Yours. Amen.",
        },
    },
    {
        "id": "saint_miguel",
        "name": "San Miguel Arcángel",
        "feast_date": "09-29",
        "image_url": IMG["miguel"],
        "order": 3,
        "is_patron_catalog": True,
        "history": {
            "es": "San Miguel es el príncipe de los ejércitos celestiales, defensor del pueblo de Dios contra el mal. Su nombre significa '¿Quién como Dios?'.",
            "en": "Saint Michael is the prince of the heavenly hosts, defender of God's people against evil. His name means 'Who is like God?'.",
        },
        "patronages": {"es": "Protección, soldados, policías, contra el mal", "en": "Protection, soldiers, police, against evil"},
        "prayer": {
            "es": "San Miguel Arcángel, defiéndenos en la batalla; sé nuestro amparo contra la perversidad. Amén.",
            "en": "Saint Michael the Archangel, defend us in battle; be our protection against wickedness. Amen.",
        },
    },
    {
        "id": "saint_judas",
        "name": "San Judas Tadeo",
        "feast_date": "10-28",
        "image_url": IMG["judas"],
        "order": 4,
        "is_patron_catalog": True,
        "history": {
            "es": "Apóstol de Cristo, San Judas Tadeo es invocado como patrono de las causas difíciles y desesperadas. Su intercesión es refugio de quienes lo han perdido todo.",
            "en": "An apostle of Christ, Saint Jude Thaddeus is invoked as patron of difficult and desperate causes. His intercession is a refuge for those who have lost all hope.",
        },
        "patronages": {"es": "Causas difíciles y desesperadas", "en": "Difficult and desperate causes"},
        "prayer": {
            "es": "San Judas Tadeo, patrono de los casos difíciles, ruega por mí en mi necesidad. Amén.",
            "en": "Saint Jude, patron of hopeless cases, pray for me in my need. Amen.",
        },
    },
    {
        "id": "saint_antonio",
        "name": "San Antonio de Padua",
        "feast_date": "06-13",
        "image_url": IMG["antonio"],
        "order": 5,
        "is_patron_catalog": True,
        "history": {
            "es": "Franciscano y doctor de la Iglesia, San Antonio es célebre por su predicación y por interceder para encontrar lo perdido, tanto objetos como almas.",
            "en": "A Franciscan and Doctor of the Church, Saint Anthony is famed for his preaching and for helping to find what is lost, both objects and souls.",
        },
        "patronages": {"es": "Objetos perdidos, los pobres, viajeros", "en": "Lost items, the poor, travelers"},
        "prayer": {
            "es": "San Antonio bendito, ayúdame a encontrar lo que busco y a no perder nunca la fe. Amén.",
            "en": "Blessed Saint Anthony, help me find what I seek and never lose faith. Amen.",
        },
    },
    {
        "id": "saint_teresa",
        "name": "Santa Teresa de Jesús",
        "feast_date": "10-15",
        "image_url": IMG["teresa"],
        "order": 6,
        "is_patron_catalog": True,
        "history": {
            "es": "Mística y reformadora del Carmelo, Santa Teresa de Ávila enseñó el camino de la oración interior. Doctora de la Iglesia, escribió 'nada te turbe, nada te espante'.",
            "en": "Mystic and reformer of Carmel, Saint Teresa of Avila taught the way of interior prayer. A Doctor of the Church, she wrote 'let nothing disturb you'.",
        },
        "patronages": {"es": "La oración, los enfermos, escritores", "en": "Prayer, the sick, writers"},
        "prayer": {
            "es": "Nada te turbe, nada te espante, solo Dios basta. Santa Teresa, enséñame a orar. Amén.",
            "en": "Let nothing disturb you; God alone suffices. Saint Teresa, teach me to pray. Amen.",
        },
    },
    {
        "id": "saint_jose",
        "name": "San José",
        "feast_date": "03-19",
        "image_url": IMG["jose"],
        "order": 7,
        "is_patron_catalog": True,
        "history": {
            "es": "Esposo de la Virgen María y padre nutricio de Jesús, San José es modelo de fe silenciosa, trabajo y entrega. Patrono de la Iglesia universal.",
            "en": "Husband of the Virgin Mary and foster father of Jesus, Saint Joseph is a model of silent faith, work, and devotion. Patron of the universal Church.",
        },
        "patronages": {"es": "Los trabajadores, las familias, la buena muerte", "en": "Workers, families, a happy death"},
        "prayer": {
            "es": "San José, hombre justo, protege a mi familia y enséñame a confiar en la providencia. Amén.",
            "en": "Saint Joseph, just man, protect my family and teach me to trust in providence. Amen.",
        },
    },
]

WORDS = ["milagro garantizado", "cadena de oracion", "reenvia esto", "brujeria", "amuleto", "maldicion"]


async def run_seed(db, pwd_ctx):
    # Saints catalog
    for s in SAINTS:
        await db.saints.update_one({"id": s["id"]}, {"$setOnInsert": s}, upsert=True)
        # keep image + core text fresh even for existing docs
        await db.saints.update_one(
            {"id": s["id"]},
            {"$set": {"image_url": s["image_url"], "history": s["history"], "prayer": s["prayer"], "patronages": s["patronages"]}},
        )

    # Daily content: today and yesterday
    today = now_utc()
    for offset, saint_id in [(0, "saint_corazon"), (-1, "saint_guadalupe")]:
        d = (today + timedelta(days=offset)).strftime("%Y-%m-%d")
        doc = {
            "date": d,
            "saint_of_day_id": saint_id,
            "gospel_ref": "Jn 15, 9-17",
            "gospel_text": {
                "es": "Como el Padre me amó, así os he amado yo; permaneced en mi amor. Este es mi mandamiento: que os améis unos a otros como yo os he amado. Nadie tiene amor más grande que el que da la vida por sus amigos.",
                "en": "As the Father has loved me, so have I loved you; abide in my love. This is my commandment: love one another as I have loved you. No one has greater love than to lay down one's life for one's friends.",
            },
            "meditation_text": {
                "es": "El amor de Cristo no es una idea, es una entrega concreta. Hoy, ¿a quién puedes amar con hechos? Deja que el Corazón de Jesús ensanche el tuyo y encuentra en la caridad tu descanso.",
                "en": "Christ's love is not an idea but a concrete gift of self. Today, whom can you love through actions? Let the Heart of Jesus enlarge your own and find your rest in charity.",
            },
            "meditation_audio_url": "",
            "morning_prayer": {
                "es": "Señor, te ofrezco este día: mis pensamientos, palabras y obras. Que todo lo que haga sea para tu gloria y el bien de los demás. Amén.",
                "en": "Lord, I offer you this day: my thoughts, words, and works. May all I do be for your glory and the good of others. Amen.",
            },
            "night_prayer": {
                "es": "Gracias, Señor, por este día. Perdona mis faltas, protege a los que amo y concédeme un descanso en tu paz. Amén.",
                "en": "Thank you, Lord, for this day. Forgive my faults, protect those I love, and grant me rest in your peace. Amen.",
            },
        }
        await db.daily_content.update_one({"date": d}, {"$setOnInsert": doc}, upsert=True)

    # Next Sunday mass 11:00 CT (~16:00 UTC)
    if await db.masses.count_documents({}) == 0:
        days_ahead = (6 - today.weekday()) % 7  # weekday: Mon=0..Sun=6
        if days_ahead == 0:
            days_ahead = 7
        sunday = (today + timedelta(days=days_ahead)).replace(hour=16, minute=0, second=0, microsecond=0)
        await db.masses.insert_one(
            {
                "id": "mass_seed_1",
                "title": {"es": "Misa Dominical del Sagrado Corazón", "en": "Sacred Heart Sunday Mass"},
                "youtube_url": "https://www.youtube.com/watch?v=DWcJFNfaw9c",
                "scheduled_at": sunday,
                "is_special": False,
                "status": "scheduled",
            }
        )

    # Causes for current month
    month = today.strftime("%Y-%m")
    if await db.causes.count_documents({"month": month}) == 0:
        causes = [
            {
                "id": "cause_church_" + month,
                "month": month,
                "name": {"es": "Restaurar la ermita de San Isidro", "en": "Restore the San Isidro chapel"},
                "location": "Oaxaca, México",
                "responsible": "P. Manuel Ríos, párroco",
                "description": {
                    "es": "La ermita de San Isidro, de más de 200 años, tiene el techo dañado y el altar en ruinas. La comunidad reza allí cada semana. Con los fondos se repara el techo, se restaura el altar y se recuperan las imágenes.",
                    "en": "The 200-year-old San Isidro chapel has a damaged roof and a ruined altar. The community prays there weekly. Funds will repair the roof, restore the altar, and recover the images.",
                },
                "budget": 18000,
                "photos": [IMG["cause_church"]],
                "timeline": "3 meses",
                "status": "voting",
                "votes": 128,
                "updates": [],
                "amount_transferred": 0,
            },
            {
                "id": "cause_water_" + month,
                "month": month,
                "name": {"es": "Pozo de agua potable para Tzeltal", "en": "Clean water well for Tzeltal"},
                "location": "Chiapas, México",
                "responsible": "Misión Tzeltal (ONG)",
                "description": {
                    "es": "120 familias caminan 2 horas por agua. Un pozo comunitario les daría agua potable segura durante todo el año.",
                    "en": "120 families walk 2 hours for water. A community well would give them safe drinking water year-round.",
                },
                "budget": 12000,
                "photos": [IMG["cause_water"]],
                "timeline": "2 meses",
                "status": "voting",
                "votes": 95,
                "updates": [],
                "amount_transferred": 0,
            },
            {
                "id": "cause_food_" + month,
                "month": month,
                "name": {"es": "Comedor parroquial en el Bronx", "en": "Parish soup kitchen in the Bronx"},
                "location": "Nueva York, EEUU",
                "responsible": "Parroquia Santa Cruz",
                "description": {
                    "es": "El comedor sirve 300 comidas diarias a familias hispanas. Los fondos cubren tres meses de alimentos y una nevera industrial.",
                    "en": "The kitchen serves 300 daily meals to Hispanic families. Funds cover three months of food and an industrial fridge.",
                },
                "budget": 9000,
                "photos": [IMG["cause_food"]],
                "timeline": "Inmediato",
                "status": "voting",
                "votes": 156,
                "updates": [],
                "amount_transferred": 0,
            },
        ]
        await db.causes.insert_many(causes)

    # Past funded cause + transparency
    if await db.transparency.count_documents({}) == 0:
        prev = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        await db.causes.insert_one(
            {
                "id": "cause_children_" + prev,
                "month": prev,
                "name": {"es": "Útiles escolares para 200 niños", "en": "School supplies for 200 children"},
                "location": "Puebla, México",
                "responsible": "Hnas. de la Caridad",
                "description": {"es": "Mochilas, cuadernos y uniformes entregados.", "en": "Backpacks, notebooks, and uniforms delivered."},
                "budget": 6000,
                "photos": [IMG["cause_children"]],
                "timeline": "Completado",
                "status": "funded",
                "votes": 210,
                "updates": [
                    {"date": prev + "-25", "text": "Entrega realizada a 200 niños. ¡Gracias comunidad!", "photo": IMG["cause_children"]}
                ],
                "amount_transferred": 5800,
            }
        )
        await db.transparency.insert_one(
            {
                "month": prev,
                "total_income": 29000,
                "impact_amount": 5800,
                "transferred": 5800,
                "cause_id": "cause_children_" + prev,
                "cause_name": "Útiles escolares para 200 niños",
                "note": "Transferencia realizada y verificada. Fotos de entrega publicadas.",
                "published": True,
            }
        )

    # Sample community intentions
    if await db.intentions.count_documents({}) == 0:
        samples = [
            {"author_name": "María G.", "text": "Rezad por mi madre que está enferma en el hospital.", "category": "salud", "pray_count": 34},
            {"author_name": "José L.", "text": "Doy gracias por el nuevo trabajo que encontré. Dios es fiel.", "category": "agradecimiento", "pray_count": 21},
            {"author_name": "Carmen R.", "text": "Por la unidad de mi familia y la conversión de mi hijo.", "category": "familia", "pray_count": 48},
            {"author_name": "Anónimo", "text": "Por el eterno descanso de mi esposo. Que en paz descanse.", "category": "difuntos", "pray_count": 62},
        ]
        for s in samples:
            await db.intentions.insert_one(
                {
                    "id": "int_seed_" + s["author_name"].replace(" ", "").replace(".", "").lower(),
                    "user_id": "seed",
                    "author_name": s["author_name"],
                    "text": s["text"],
                    "category": s["category"],
                    "pray_count": s["pray_count"],
                    "prayed_by": [],
                    "status": "approved",
                    "created_at": now_utc(),
                }
            )

    # Moderation words
    for w in WORDS:
        await db.moderation_words.update_one({"word": w}, {"$setOnInsert": {"word": w}}, upsert=True)

    # Admin + staff users
    staff = [
        ("admin@misagradocorazon.com", "Sagrado2026", "Juan (Superadmin)", "superadmin", "user_superadmin"),
        ("editor@misagradocorazon.com", "Editor2026", "Editor de Contenido", "editor", "user_editor"),
        ("moderador@misagradocorazon.com", "Moderador2026", "Moderador", "moderator", "user_moderator"),
    ]
    for email, pw, name, role, uid in staff:
        exists = await db.users.find_one({"email": email})
        if not exists:
            await db.users.insert_one(
                {
                    "user_id": uid,
                    "email": email,
                    "name": name,
                    "password_hash": pwd_ctx.hash(pw),
                    "role": role,
                    "language": "es",
                    "onboarded": True,
                    "patron_saint_id": "saint_corazon",
                    "secondary_saint_ids": [],
                    "streak": 0,
                    "blocked": False,
                    "created_at": now_utc(),
                }
            )
