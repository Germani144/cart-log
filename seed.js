// Built-in item database: Danish name = English name, grouped by category.
// Categories are listed in a typical store-walk order; the 4th value is the category color. Your own additions live in Firestore, not here.
const SEED_CATS=[
  ['frugt','Frugt & grønt','Fruit & vegetables','#2F855A'],
  ['brod','Brød & bagværk','Bread & bakery','#A16207'],
  ['koed','Kød','Meat','#B83232'],
  ['fisk','Fisk & skaldyr','Fish & seafood','#2B6CB0'],
  ['paalaeg','Pålæg','Deli & cold cuts','#B83280'],
  ['mejeri','Mejeri & æg','Dairy & eggs','#E6C65C'],
  ['kolonial','Kolonial','Pantry','#C05621'],
  ['krydderier','Krydderier & saucer','Spices & sauces','#6B46C1'],
  ['frost','Frost','Frozen','#A8D8F0'],
  ['drikke','Drikkevarer','Drinks','#4C51BF'],
  ['snacks','Snacks & slik','Snacks & sweets','#657A0F'],
  ['husholdning','Husholdning','Household','#4A5568'],
  ['pleje','Personlig pleje','Personal care','#0F766E'],
  ['baby','Baby','Baby','#D9C7F5'],
  ['dyr','Kæledyr','Pets','#7B5B3A'],
  ['andet','Andet','Other','#5F6B7A']
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

// Standard amount + unit for each item (edit per item on the list, or change the default by saving the item dialog).
// Units: pcs, g, kg, ml, dl, l, pack, can, bottle, bunch. Items not listed use their category's default below.
const SEED_CATDEF={frugt:'1 pcs',brod:'1 pcs',koed:'500 g',fisk:'300 g',paalaeg:'1 pack',mejeri:'1 pcs',kolonial:'1 pack',krydderier:'1 pcs',frost:'1 pack',drikke:'1 bottle',snacks:'1 pack',husholdning:'1 pack',pleje:'1 pcs',baby:'1 pack',dyr:'1 pack',andet:'1 pcs'};
const SEED_DEF=[
  // fruit & veg
  'Æbler=1 kg','Bananer=1 bunch','Appelsiner=1 kg','Clementiner=1 kg','Citroner=2 pcs','Limefrugter=2 pcs','Grapefrugt=2 pcs','Pærer=1 kg','Druer=500 g','Jordbær=250 g','Blåbær=125 g','Hindbær=125 g','Mango=2 pcs','Avocado=2 pcs','Kiwi=4 pcs','Ferskner=4 pcs','Nektariner=4 pcs',
  'Kartofler=1 kg','Søde kartofler=500 g','Løg=1 kg','Rødløg=3 pcs','Forårsløg=1 bunch','Gulerødder=1 kg','Tomater=500 g','Cherrytomater=250 g','Peberfrugt=2 pcs','Spinat=200 g','Grønkål=200 g','Champignon=250 g','Porrer=2 pcs','Rødbeder=500 g','Radiser=1 bunch','Majs=2 pcs','Asparges=1 bunch','Ingefær=100 g','Chili=2 pcs','Persille=1 bunch','Dild=1 bunch','Purløg=1 bunch','Rucola=100 g','Koriander=1 bunch','Mynte=1 bunch',
  // bread
  'Boller=6 pcs','Rundstykker=4 pcs','Croissanter=4 pcs','Wienerbrød=2 pcs','Tebirkes=2 pcs','Kanelsnegle=2 pcs','Skolebrød=2 pcs',
  // meat & fish
  'Hakkebøffer=1 pack','Kyllingebryst=1 pack','Kyllingelår=1 pack','Hel kylling=1 pcs','Kalkunbryst=1 pack','Bacon=1 pack','Pølser=1 pack','Frikadeller=1 pack','Flæskesteg=1 kg','Svinekoteletter=4 pcs','Oksefilet=400 g','Bøf=2 pcs','Spareribs=1 kg','Lammekølle=1 pcs',
  'Røget laks=100 g','Rejer=200 g','Muslinger=1 kg','Sild=1 pack','Makrel=1 pcs','Tun på dåse=1 can','Fiskefilet=1 pack','Fiskefrikadeller=1 pack','Makrel i tomat=1 can','Spegepølse=1 pcs',
  // dairy & eggs
  'Mælk=1 l','Sødmælk=1 l','Letmælk=1 l','Skummetmælk=1 l','Kærnemælk=1 l','Havredrik=1 l','Mandeldrik=1 l','Sojadrik=1 l','Kakaomælk=0,5 l','Fløde=2 dl','Piskefløde=2 dl','Madlavningsfløde=2 dl','Smør=250 g','Margarine=500 g','Æg=10 pcs','Yoghurt=1 l','Græsk yoghurt=500 g','Ost=300 g','Revet ost=1 pack','Cheddar=200 g','Feta=1 pack','Havarti=300 g','Danbo=300 g',
  // pantry
  'Pasta=500 g','Spaghetti=500 g','Penne=500 g','Ris=1 kg','Basmatiris=1 kg','Couscous=500 g','Quinoa=500 g','Mel=1 kg','Sukker=1 kg','Flormelis=500 g','Havregryn=1 kg','Müsli=750 g','Linser=500 g','Kikærter=1 can','Kidneybønner=1 can','Hvide bønner=1 can','Hakkede tomater=1 can','Tomatpuré=1 can','Kokosmælk=1 can','Majs på dåse=1 can','Olivenolie=1 bottle','Rapsolie=1 bottle','Eddike=1 bottle','Nødder=200 g','Mandler=200 g','Rosiner=250 g',
  // sauces
  'Ketchup=1 bottle','Sojasovs=1 bottle','Chilisauce=1 bottle','Dressing=1 bottle',
  // frozen & drinks
  'Frostpizza=1 pcs','Is=1 l','Vand=1,5 l','Danskvand=6 bottle','Sodavand=1,5 l','Cola=1,5 l','Juice=1 l','Appelsinjuice=1 l','Æblejuice=1 l','Saft=1 bottle','Iste=1,5 l','Kaffe=500 g','Øl=6 bottle','Rødvin=1 bottle','Hvidvin=1 bottle','Energidrik=1 can',
  // snacks & household & care
  'Kage=1 pcs','Opvaskemiddel=1 bottle','Skyllemiddel=1 bottle','Universalrens=1 bottle','Bagepapir=1 pcs','Alufolie=1 pcs','Elpærer=1 pcs','Mundskyl=1 bottle','Shampoo=1 bottle','Balsam=1 bottle','Håndsæbe=1 bottle','Solcreme=1 bottle','Bodylotion=1 bottle',
  // baby
  'Babymos=4 pcs','Babyshampoo=1 bottle','Bleecreme=1 pcs'
].join(';');
