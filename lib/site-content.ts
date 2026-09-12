export type GroveZone={id:string;name:string;aspect:string;character:string;treeCount:number};
export type HarvestStep={number:string;title:string;detail:string;metric:string};
export type ClubPlan={id:"monthly"|"bimonthly"|"adopt";name:string;cadence:string;price:string;benefits:string[]};
export type TraceLot={id:string;harvestDate:string;acidity:string;polyphenol:string;parcel:string;pressing:string;status:"sample"|"verified"};

export const groveZones:GroveZone[]=[
 {id:"west",name:"Ataeymir-Batı",aspect:"Gün batımı yamacı",character:"Taşlı-killi toprak · dengeli su tutuşu",treeCount:148},
 {id:"central",name:"Orta Bahçe",aspect:"Korunaklı düzlük",character:"Derin toprak · düzenli olgunlaşma",treeCount:196},
 {id:"ridge",name:"Karya Sırtı",aspect:"Rüzgâra açık teras",character:"Kireçli yapı · belirgin aromatik karakter",treeCount:112},
];
export const harvestSteps:HarvestStep[]=[
 {number:"01",title:"Elle erken hasat",detail:"Meyve zedelenmeden seçilir, hava alan kasalara alınır.",metric:"Aynı gün"},
 {number:"02",title:"Soğuk sıkım",detail:"Mekanik yöntemle, sıcaklık kontrollü üretim.",metric:"<24°C hedef"},
 {number:"03",title:"Azot altında dinlendirme",detail:"Oksijenle temas azaltılarak paslanmaz tanklarda korunur.",metric:"Işık ve hava kontrolü"},
 {number:"04",title:"Koyu cam şişeleme",detail:"Hasat karakterini koruyan UV korumalı cam ve lot etiketi.",metric:"İzlenebilir lot"},
];
export const clubPlans:ClubPlan[]=[
 {id:"monthly",name:"Her Ay",cadence:"500 ml × 2 / ay",price:"1.990 TL",benefits:["%15 üye indirimi","Hasat sürprizleri","Öncelikli tadım daveti"]},
 {id:"bimonthly",name:"İki Ayda Bir",cadence:"500 ml × 2 / 2 ay",price:"1.690 TL",benefits:["%15 üye indirimi","Sezonluk tadım notları","Üyelere özel seri"]},
 {id:"adopt",name:"Bir Ağaç Sahiplen",cadence:"Yıllık üyelik",price:"7.900 TL",benefits:["Ağaca isim verme","Sezonluk fotoğraf/video","Kişisel etiketli hasat şişesi"]},
];
export const sampleLot:TraceLot={id:"26-004",harvestDate:"Ekim 2026",acidity:"%0.28 (örnek)",polyphenol:"Analiz sonrası eklenecek",parcel:"Ataeymir-Batı",pressing:"<24°C hedef",status:"sample"};
