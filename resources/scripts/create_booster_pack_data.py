import json

with open("cardInfo.json", "r") as api_data_file:
    api_data = json.load(api_data_file)

def extract_rarities(data):
    rarities = set()
    for card in data["data"]:
        if "card_sets" in card:
            for card_set in card["card_sets"]:
                rarities.add(card_set["set_rarity"])
    return list(rarities)

def assign_chances_to_rarities(rarities):
    rarity_chances = {
        "Common": 8/9,
        "Rare": 1/9,
        "Super Rare": 1/5,
        "Ultra Rare": 1/12,
        "Secret Rare": 1/23,
        "Ultimate Rare": 1/24,
        "Ghost Rare": 1/288,
    }
    for rarity in rarities:
        if rarity not in rarity_chances:
            rarity_chances[rarity] = 0.003
    return {rarity: round(chance, 4) for rarity, chance in rarity_chances.items()}

def create_booster_pack_json(data, rarity_chances, min_price, max_price, markup):
    booster_packs = {}
    for card in data["data"]:
        if "card_sets" in card:
            for card_set in card["card_sets"]:
                booster_name = card_set["set_name"]
                booster_code = card_set["set_code"]
                card_id = card["id"]
                rarity = card_set["set_rarity"]
                chance = rarity_chances.get(rarity, 0.0)
                price = float(card_set["set_price"])
                if booster_name not in booster_packs:
                    booster_packs[booster_name] = {"cards": [], "code": booster_code, "total_weighted_price": 0, "card_count": 0}
                booster_packs[booster_name]["cards"].append({"id": card_id, "chance": chance, "rarity": rarity})
                booster_packs[booster_name]["total_weighted_price"] += price * chance
                booster_packs[booster_name]["card_count"] += 1

    for booster_name in booster_packs:
        num_cards = booster_packs[booster_name]["card_count"]
        cards_per_pack = 9
        booster_chances = [card["chance"] for card in booster_packs[booster_name]["cards"]]

        if num_cards < cards_per_pack:
            factor = cards_per_pack / num_cards
            booster_chances = [chance * factor for chance in booster_chances]

        weighted_average_price = sum(booster_chances[i] * booster_packs[booster_name]["cards"][i]["chance"] for i in range(num_cards)) / cards_per_pack
        price_with_markup = max(min_price, min(weighted_average_price + markup, max_price))
        booster_packs[booster_name]["price"] = round(price_with_markup, 2)

    output = [{"name": name, "cards": info["cards"], "code": info["code"], "price": info["price"]} for name, info in booster_packs.items()]
    return output


min_price = 2.5
max_price = 6
markup = 0.5

rarities = extract_rarities(api_data)
rarity_chances = assign_chances_to_rarities(rarities)
booster_pack_data = create_booster_pack_json(api_data, rarity_chances, min_price, max_price, markup)
filtered_booster_packs = [pack for pack in booster_pack_data if len(pack["cards"]) >= 9]

with open("booster_packs.json", "w") as outfile:
    json.dump(filtered_booster_packs, outfile)
