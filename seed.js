// Built-in item database: Danish name = English name, grouped by category.
// Categories are listed in a typical store-walk order. Your own additions live in Firestore, not here.
const SEED_CATS=[
  ['frugt','Frugt & grønt','Fruit & vegetables'],
  ['brod','Brød & bagværk','Bread & bakery'],
  ['koed','Kød','Meat'],
  ['fisk','Fisk & skaldyr','Fish & seafood'],
  ['paalaeg','Pålæg','Deli & cold cuts'],
  ['mejeri','Mejeri & æg','Dairy & eggs'],
  ['kolonial','Kolonial','Pantry'],
  ['krydderier','Krydderier & saucer','Spices & sauces'],
  ['frost','Frost','Frozen'],
  ['drikke','Drikkevarer','Drinks'],
  ['snacks','Snacks & slik','Snacks & sweets'],
  ['husholdning','Husholdning','Household'],
  ['pleje','Personlig pleje','Personal care'],
  ['baby','Baby','Baby'],
  ['dyr','Kæledyr','Pets'],
  ['andet','Andet','Other']
];
const SEED_ITEMS={
  frugt:'Æbler=Apples;Bananer=Bananas;Appelsiner=Oranges;Clementiner=Clementines;Citroner=Lemons;Limefrugter=Limes;Grapefrugt=Grapefruit;Pærer=Pears;Druer=Grapes;Jordbær=Strawberries;Blåbær=Blueberries;Hindbær=Raspberries;Vandmelon=Watermelon;Melon=Melon;Ananas=Pineapple;Mango=Mango;Avocado=Avocado;Kiwi=Kiwi;Ferskner=Peaches;Nektariner=Nectarines;Kartofler=Potatoes;Søde kartofler=Sweet potatoes;Løg=Onions;Rødløg=Red onions;Hvidløg=Garlic;Forårsløg=Spring onions;Gulerødder=Carrots;Tomater=Tomatoes;Cherrytomater=Cherry tomatoes;Agurk=Cucumber;Peberfrugt=Bell pepper;Salat=Lettuce;Icebergsalat=Iceberg lettuce;Spinat=Spinach;Broccoli=Broccoli;Blomkål=Cauliflower;Hvidkål=White cabbage;Rødkål=Red cabbage;Grønkål=Kale;Squash=Zucchini;Aubergine=Eggplant;Champignon=Mushrooms;Porrer=Leeks;Selleri=Celery;Rødbeder=Beetroot;Radiser=Radishes;Fennikel=Fennel;Majs=Corn on the cob;Græskar=Pumpkin;Asparges=Asparagus;Ingefær=Ginger;Chili=Chili;Persille=Parsley;Dild=Dill;Basilikum=Basil;Purløg=Chives;Rucola=Arugula;Koriander=Coriander;Mynte=Mint',
  brod:'Rugbrød=Rye bread;Franskbrød=White bread;Toastbrød=Sandwich bread;Boller=Bread rolls;Rundstykker=Morning rolls;Hamburgerboller=Burger buns;Hotdogbrød=Hot dog buns;Tortillas=Tortillas;Pitabrød=Pita bread;Pizzabund=Pizza base;Croissanter=Croissants;Wienerbrød=Danish pastry;Tebirkes=Poppy seed pastry;Kanelsnegle=Cinnamon rolls;Knækbrød=Crispbread;Skolebrød=Custard bun',
  koed:'Hakket oksekød=Ground beef;Hakket svinekød=Ground pork;Hakkebøffer=Beef patties;Kyllingebryst=Chicken breast;Kyllingelår=Chicken thighs;Hel kylling=Whole chicken;Kalkunbryst=Turkey breast;Bacon=Bacon;Pølser=Sausages;Medister=Medister sausage;Frikadeller=Meatballs;Flæskesteg=Roast pork;Svinekoteletter=Pork chops;Oksefilet=Beef tenderloin;Bøf=Steak;Spareribs=Spare ribs;Lammekølle=Leg of lamb;Nakkefilet=Pork neck',
  fisk:'Laks=Salmon;Røget laks=Smoked salmon;Torsk=Cod;Rødspætte=Plaice;Rejer=Shrimp;Muslinger=Mussels;Sild=Herring;Makrel=Mackerel;Tun på dåse=Canned tuna;Fiskefilet=Fish fillet;Fiskefrikadeller=Fish cakes',
  paalaeg:'Skinke=Ham;Salami=Salami;Leverpostej=Liver pâté;Rullepølse=Spiced pork roll;Hamburgerryg=Cured pork loin;Spegepølse=Dry-cured sausage;Kyllingepålæg=Chicken cold cuts;Makrel i tomat=Mackerel in tomato;Hummus=Hummus;Smøreost=Spreadable cheese',
  mejeri:'Mælk=Milk;Sødmælk=Whole milk;Letmælk=Semi-skimmed milk;Skummetmælk=Skimmed milk;Kærnemælk=Buttermilk;Havredrik=Oat drink;Mandeldrik=Almond drink;Sojadrik=Soy drink;Kakaomælk=Chocolate milk;Fløde=Cream;Piskefløde=Whipping cream;Madlavningsfløde=Cooking cream;Creme fraiche=Crème fraîche;Smør=Butter;Margarine=Margarine;Æg=Eggs;Yoghurt=Yogurt;Græsk yoghurt=Greek yogurt;Skyr=Skyr;Cottage cheese=Cottage cheese;Ost=Cheese;Revet ost=Grated cheese;Cheddar=Cheddar;Mozzarella=Mozzarella;Parmesan=Parmesan;Feta=Feta;Brie=Brie;Havarti=Havarti;Danbo=Danbo cheese;Flødeost=Cream cheese',
  kolonial:'Pasta=Pasta;Spaghetti=Spaghetti;Penne=Penne;Lasagneplader=Lasagna sheets;Ris=Rice;Basmatiris=Basmati rice;Nudler=Noodles;Couscous=Couscous;Quinoa=Quinoa;Mel=Flour;Sukker=Sugar;Flormelis=Icing sugar;Havregryn=Rolled oats;Müsli=Muesli;Cornflakes=Cornflakes;Linser=Lentils;Kikærter=Chickpeas;Kidneybønner=Kidney beans;Hvide bønner=White beans;Hakkede tomater=Chopped tomatoes;Tomatpuré=Tomato paste;Kokosmælk=Coconut milk;Majs på dåse=Canned corn;Bouillon=Stock cubes;Olivenolie=Olive oil;Rapsolie=Rapeseed oil;Eddike=Vinegar;Honning=Honey;Marmelade=Jam;Jordnøddesmør=Peanut butter;Nøddecreme=Hazelnut spread;Nødder=Nuts;Mandler=Almonds;Rosiner=Raisins;Bagepulver=Baking powder;Gær=Yeast;Vaniljesukker=Vanilla sugar;Kakao=Cocoa;Majsstivelse=Cornstarch',
  krydderier:'Salt=Salt;Peber=Pepper;Paprika=Paprika;Karry=Curry powder;Kanel=Cinnamon;Spidskommen=Cumin;Oregano=Oregano;Timian=Thyme;Laurbærblade=Bay leaves;Hvidløgspulver=Garlic powder;Muskatnød=Nutmeg;Ketchup=Ketchup;Sennep=Mustard;Mayonnaise=Mayonnaise;Remoulade=Remoulade;Sojasovs=Soy sauce;Pesto=Pesto;Pastasauce=Pasta sauce;Chilisauce=Chili sauce;Dressing=Salad dressing;Bearnaisesauce=Béarnaise sauce',
  frost:'Frosne grøntsager=Frozen vegetables;Frosne ærter=Frozen peas;Frosne bær=Frozen berries;Frossen spinat=Frozen spinach;Frostpizza=Frozen pizza;Is=Ice cream;Pommes frites=French fries;Fiskepinde=Fish fingers;Nuggets=Chicken nuggets',
  drikke:'Vand=Water;Danskvand=Sparkling water;Sodavand=Soda;Cola=Cola;Juice=Juice;Appelsinjuice=Orange juice;Æblejuice=Apple juice;Saft=Cordial;Iste=Iced tea;Kaffe=Coffee;Te=Tea;Øl=Beer;Rødvin=Red wine;Hvidvin=White wine;Energidrik=Energy drink',
  snacks:'Chips=Chips;Chokolade=Chocolate;Slik=Candy;Vingummi=Gummy candy;Lakrids=Liquorice;Flødeboller=Chocolate marshmallow puffs;Kiks=Biscuits;Kage=Cake;Popcorn=Popcorn;Nøddemix=Mixed nuts;Müslibar=Granola bar',
  husholdning:'Toiletpapir=Toilet paper;Køkkenrulle=Paper towels;Servietter=Napkins;Opvasketabs=Dishwasher tablets;Opvaskemiddel=Dish soap;Vaskepulver=Laundry detergent;Skyllemiddel=Fabric softener;Universalrens=All-purpose cleaner;Svampe=Sponges;Affaldsposer=Trash bags;Fryseposer=Freezer bags;Bagepapir=Baking paper;Alufolie=Aluminium foil;Batterier=Batteries;Elpærer=Light bulbs;Stearinlys=Candles;Tændstikker=Matches',
  pleje:'Tandpasta=Toothpaste;Tandbørste=Toothbrush;Tandtråd=Dental floss;Mundskyl=Mouthwash;Shampoo=Shampoo;Balsam=Conditioner;Sæbe=Soap;Håndsæbe=Hand soap;Deodorant=Deodorant;Barberskraber=Razors;Plastre=Band-aids;Tamponer=Tampons;Bind=Sanitary pads;Solcreme=Sunscreen;Bodylotion=Body lotion;Vatpinde=Cotton swabs;Vatrondeller=Cotton pads',
  baby:'Bleer=Diapers;Vådservietter=Wet wipes;Bleecreme=Diaper cream;Modermælkserstatning=Infant formula;Babymos=Baby puree;Babygrød=Baby porridge;Babyshampoo=Baby shampoo',
  dyr:'Hundefoder=Dog food;Kattefoder=Cat food;Kattegrus=Cat litter'
};
