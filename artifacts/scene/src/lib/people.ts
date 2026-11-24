export interface Person {
  id: string;
  name: string;
  age: number;
  city: string;
  bio: string;
  photo: string;
  scene: string;
  sceneFrom: string;
  favorites: string[];
  likesMe: boolean;
  replies: string[];
}

const img = (n: number) => `${import.meta.env.BASE_URL}people/p${n}.jpg`;

export const PEOPLE: Person[] = [
  { id: "ela", name: "Ela", age: 28, city: "İstanbul", photo: img(1), likesMe: true, bio: "Kadıköy'de gece seanslarının müdavimi. Jenerik bitmeden kalkanlarla anlaşamam.", scene: "Spinning top dönmeye devam ederken ekran kararır.", sceneFrom: "inception", favorites: ["inception", "interstellar", "dark", "her", "eternal", "fleabag"], replies: ["O sahneyi ilk izlediğimde salonda kimse kıpırdamamıştı.", "Bu hafta sonu Kadıköy'de Nolan gecesi var, bilgin olsun.", "Sence topaç düştü mü? Ben hala karar veremedim."] },
  { id: "kaan", name: "Kaan", age: 31, city: "Ankara", photo: img(2), likesMe: true, bio: "Kurgu masasında büyüdüm. Bir filmi ikinci kez izlemeden yorum yapmam.", scene: "Say my name.", sceneFrom: "breakingbad", favorites: ["breakingbad", "godfather", "taxi", "darkknight", "chernobyl", "succession", "truedetective"], replies: ["Walter'ın o anki sessizliği her şeyi anlatıyor.", "Succession'ın son sezonunu birlikte tartışmamız lazım.", "Ankara'da iyi bir sinematek biliyorum, merak edersen."] },
  { id: "mira", name: "Mira", age: 25, city: "İzmir", photo: img(3), likesMe: true, bio: "Müzikal sevmeyenlere bir şans daha veriyorum. Genelde ikna ediyorum.", scene: "Planetaryumda yerçekimi kaybolur, ikisi yıldızların arasında dans eder.", sceneFrom: "lalaland", favorites: ["lalaland", "whiplash", "amelie", "spirited", "sunrise", "bear"], replies: ["Not quite my tempo cümlesi hala kulağımda.", "Amelie'yi her kış yeniden izliyorum.", "Bir dahaki film önerini bekliyorum."] },
  { id: "deniz", name: "Deniz", age: 35, city: "İstanbul", photo: img(4), likesMe: true, bio: "Vapurda film eleştirisi okuyan o kişi benim. Kore sineması tutkunuyum.", scene: "Yağmur merdivenlerden aşağı akarken aile eve koşar.", sceneFrom: "parasite", favorites: ["parasite", "moodlove", "godfather", "shawshank", "dark", "chernobyl"], replies: ["Bong Joon-ho merdivenleri nasıl kullanıyor, fark ettin mi?", "Wong Kar-wai'yi yağmurlu bir akşam izlemek gerek.", "Vapurdayım, sinyal gidip geliyor."] },
  { id: "selin", name: "Selin", age: 30, city: "Eskişehir", photo: img(5), likesMe: false, bio: "Eski bir video kiralama dükkanında çalıştım. Kapak tasarımlarına hala aşığım.", scene: "Jules, Ezekiel 25:17'yi okur.", sceneFrom: "pulp", favorites: ["pulp", "fightclub", "matrix", "taxi", "office", "stranger"], replies: ["Tarantino diyalogları başka bir dil.", "Office'te en sevdiğin bölüm hangisi?"] },
  { id: "arda", name: "Arda", age: 26, city: "İzmir", photo: img(6), likesMe: true, bio: "Çatıda açık hava gösterimleri düzenliyorum. Projektörü ben taşırım.", scene: "Joker merdivenlerden dans ederek iner.", sceneFrom: "joker", favorites: ["joker", "darkknight", "matrix", "interstellar", "got", "stranger", "severance"], replies: ["Çatı gösterimine Interstellar koymayı düşünüyorum.", "Severance'ın ofis koridorları beni hala ürpertiyor."] },
  { id: "nil", name: "Nil", age: 33, city: "İstanbul", photo: img(7), likesMe: false, bio: "Kurgucu. Bir sahnenin ritmini nefesimden anlarım.", scene: "Clementine kumsaldaki evde 'Montauk'ta buluşalım' der.", sceneFrom: "eternal", favorites: ["eternal", "her", "moodlove", "fleabag", "severance", "succession"], replies: ["Fleabag'in kameraya dönüşü kurgunun zirvesi."] },
  { id: "emre", name: "Emre", age: 29, city: "Ankara", photo: img(8), likesMe: false, bio: "Analog fotoğraf ve uzun planlar. Miyazaki benim için ilkbahar.", scene: "Haku ve Chihiro gökyüzünde süzülürken isim hatırlanır.", sceneFrom: "spirited", favorites: ["spirited", "amelie", "shawshank", "got", "bear", "office"], replies: ["Ghibli maratonu için en iyi sıralama sence ne?"] },
];

export const personById = (id: string) => PEOPLE.find((p) => p.id === id);
