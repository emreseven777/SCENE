export type TitleType = "film" | "dizi";

export interface Title {
  id: string;
  type: TitleType;
  title: string;
  original?: string;
  year: number;
  poster: string;
  genres: string[];
  by: string;
  overview: string;
}

const T = (p: string) => `https://image.tmdb.org/t/p/w500${p}`;

export const CATALOG: Title[] = [
  { id: "godfather", type: "film", title: "Baba", original: "The Godfather", year: 1972, poster: T("/3bhkrj58Vtu7enYsRolD1fZdja1.jpg"), genres: ["Suç", "Dram"], by: "Francis Ford Coppola", overview: "Corleone ailesinin yaşlanan reisi, imparatorluğunu isteksiz oğluna devreder." },
  { id: "pulp", type: "film", title: "Ucuz Roman", original: "Pulp Fiction", year: 1994, poster: T("/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"), genres: ["Suç", "Gerilim"], by: "Quentin Tarantino", overview: "İki tetikçi, bir boksör ve bir gangsterin karısı; birbirine dolanan Los Angeles hikayeleri." },
  { id: "fightclub", type: "film", title: "Dövüş Kulübü", original: "Fight Club", year: 1999, poster: T("/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"), genres: ["Dram"], by: "David Fincher", overview: "Uykusuz bir ofis çalışanı ile karizmatik bir sabun satıcısı yeraltı dövüş kulübü kurar." },
  { id: "inception", type: "film", title: "Başlangıç", original: "Inception", year: 2010, poster: T("/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"), genres: ["Bilim Kurgu", "Aksiyon"], by: "Christopher Nolan", overview: "Rüyalara sızarak sır çalan bir hırsız, bu kez bir fikir yerleştirmek zorundadır." },
  { id: "interstellar", type: "film", title: "Yıldızlararası", original: "Interstellar", year: 2014, poster: T("/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"), genres: ["Bilim Kurgu", "Dram"], by: "Christopher Nolan", overview: "İnsanlığın yeni bir yuva araması, bir babanın kızına dönme vaadiyle kesişir." },
  { id: "darkknight", type: "film", title: "Kara Şövalye", original: "The Dark Knight", year: 2008, poster: T("/qJ2tW6WMUDux911r6m7haRef0WH.jpg"), genres: ["Aksiyon", "Suç"], by: "Christopher Nolan", overview: "Batman, Gotham'ı kaosa sürüklemek isteyen Joker ile yüzleşir." },
  { id: "parasite", type: "film", title: "Parazit", original: "Gisaengchung", year: 2019, poster: T("/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"), genres: ["Gerilim", "Dram"], by: "Bong Joon-ho", overview: "Yoksul Kim ailesi, zengin Park ailesinin hayatına adım adım sızar." },
  { id: "spirited", type: "film", title: "Ruhların Kaçışı", original: "Sen to Chihiro", year: 2001, poster: T("/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"), genres: ["Animasyon", "Fantastik"], by: "Hayao Miyazaki", overview: "Chihiro, ailesini kurtarmak için ruhların yıkandığı gizemli bir hamamda çalışır." },
  { id: "shawshank", type: "film", title: "Esaretin Bedeli", original: "The Shawshank Redemption", year: 1994, poster: T("/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg"), genres: ["Dram"], by: "Frank Darabont", overview: "Haksız yere hapse giren bir bankacı, umudu yirmi yıl boyunca diri tutar." },
  { id: "whiplash", type: "film", title: "Whiplash", year: 2014, poster: T("/7fn624j5lj3xTme2SgiLCeuedmO.jpg"), genres: ["Dram", "Müzik"], by: "Damien Chazelle", overview: "Genç bir davulcu ile acımasız hocası arasında mükemmellik savaşı." },
  { id: "lalaland", type: "film", title: "Aşıklar Şehri", original: "La La Land", year: 2016, poster: T("/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg"), genres: ["Müzikal", "Romantik"], by: "Damien Chazelle", overview: "Bir caz piyanisti ve oyuncu adayı, hayaller ile aşk arasında seçim yapar." },
  { id: "joker", type: "film", title: "Joker", year: 2019, poster: T("/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg"), genres: ["Suç", "Dram"], by: "Todd Phillips", overview: "Görmezden gelinen bir komedyenin Gotham sokaklarında çözülüşü." },
  { id: "matrix", type: "film", title: "Matrix", original: "The Matrix", year: 1999, poster: T("/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"), genres: ["Bilim Kurgu", "Aksiyon"], by: "Wachowski Kardeşler", overview: "Bir hacker, gerçekliğin bir simülasyon olduğunu öğrenir." },
  { id: "her", type: "film", title: "Aşk", original: "Her", year: 2013, poster: T("/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg"), genres: ["Romantik", "Bilim Kurgu"], by: "Spike Jonze", overview: "Yalnız bir yazar, işletim sistemine aşık olur." },
  { id: "eternal", type: "film", title: "Sil Baştan", original: "Eternal Sunshine of the Spotless Mind", year: 2004, poster: T("/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg"), genres: ["Romantik", "Dram"], by: "Michel Gondry", overview: "Ayrılan bir çift, birbirlerini hafızalarından sildirmeye karar verir." },
  { id: "moodlove", type: "film", title: "Aşk Zamanı", original: "In the Mood for Love", year: 2000, poster: T("/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg"), genres: ["Romantik", "Dram"], by: "Wong Kar-wai", overview: "1962 Hong Kong'unda, eşleri tarafından aldatılan iki komşunun sessiz yakınlığı." },
  { id: "sunrise", type: "film", title: "Gün Doğmadan", original: "Before Sunrise", year: 1995, poster: T("/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg"), genres: ["Romantik"], by: "Richard Linklater", overview: "Trende tanışan iki yabancı, Viyana'da tek bir gece geçirir." },
  { id: "taxi", type: "film", title: "Taksi Şoförü", original: "Taxi Driver", year: 1976, poster: T("/ekstpH614fwDX8DUln1a2Opz0N8.jpg"), genres: ["Suç", "Dram"], by: "Martin Scorsese", overview: "Uykusuz bir gece şoförü, New York'un karanlığında kendi savaşını başlatır." },
  { id: "amelie", type: "film", title: "Amelie", original: "Le Fabuleux Destin d'Amélie Poulain", year: 2001, poster: T("/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg"), genres: ["Komedi", "Romantik"], by: "Jean-Pierre Jeunet", overview: "Montmartre'da bir garson kız, gizlice başkalarının hayatını güzelleştirir." },
  { id: "breakingbad", type: "dizi", title: "Breaking Bad", year: 2008, poster: T("/ggFHVNu6YYI5L9pCfOacjizRGt.jpg"), genres: ["Suç", "Dram"], by: "Vince Gilligan", overview: "Kimya öğretmeni Walter White, teşhisinden sonra karanlık bir yola girer." },
  { id: "got", type: "dizi", title: "Game of Thrones", year: 2011, poster: T("/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg"), genres: ["Fantastik", "Dram"], by: "David Benioff, D. B. Weiss", overview: "Yedi Krallık'ın tahtı için soylu aileler arasında amansız bir savaş." },
  { id: "stranger", type: "dizi", title: "Stranger Things", year: 2016, poster: T("/49WJfeN0moxb9IPfGn8AIqMGskD.jpg"), genres: ["Bilim Kurgu", "Korku"], by: "Duffer Kardeşler", overview: "Hawkins'te kaybolan bir çocuk, kasabanın altındaki karanlığı açığa çıkarır." },
  { id: "dark", type: "dizi", title: "Dark", year: 2017, poster: T("/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg"), genres: ["Bilim Kurgu", "Gizem"], by: "Baran bo Odar", overview: "Winden'de kaybolan çocuklar, dört kuşağı birbirine bağlayan bir zaman döngüsünü ortaya çıkarır." },
  { id: "chernobyl", type: "dizi", title: "Chernobyl", year: 2019, poster: T("/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg"), genres: ["Dram", "Tarih"], by: "Craig Mazin", overview: "1986 nükleer felaketinin ve ardındaki yalanların hikayesi." },
  { id: "succession", type: "dizi", title: "Succession", year: 2018, poster: T("/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg"), genres: ["Dram"], by: "Jesse Armstrong", overview: "Bir medya imparatorluğunun varisleri, babalarının tahtı için birbirini yer." },
  { id: "bear", type: "dizi", title: "The Bear", year: 2022, poster: T("/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg"), genres: ["Dram", "Komedi"], by: "Christopher Storer", overview: "Ünlü bir şef, ağabeyinden kalan Chicago'daki sandviççiyi ayakta tutmaya çalışır." },
  { id: "severance", type: "dizi", title: "Severance", year: 2022, poster: T("/lFf6LLrQjYldcZItzOkGmMMigP7.jpg"), genres: ["Gerilim", "Bilim Kurgu"], by: "Dan Erickson", overview: "Çalışanların iş ve özel hafızaları cerrahi olarak ayrılmıştır." },
  { id: "truedetective", type: "dizi", title: "True Detective", year: 2014, poster: T("/cuV2O5ZyDLHSOWzg3nLVljp1ubw.jpg"), genres: ["Suç", "Gizem"], by: "Nic Pizzolatto", overview: "Louisiana'da iki dedektif, on yedi yıla yayılan bir cinayetin peşindedir." },
  { id: "fleabag", type: "dizi", title: "Fleabag", year: 2016, poster: T("/27vEYsRKa3eAniwmoccOoluEXQ1.jpg"), genres: ["Komedi", "Dram"], by: "Phoebe Waller-Bridge", overview: "Londra'da öfkeli, komik ve yaralı bir kadın, kameraya dönüp her şeyi itiraf eder." },
  { id: "office", type: "dizi", title: "The Office", year: 2005, poster: T("/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg"), genres: ["Komedi"], by: "Greg Daniels", overview: "Bir kağıt şirketinin Scranton şubesinde sıradan, tuhaf ve sevimli bir ofis hayatı." },
];

export const byId = (id: string) => CATALOG.find((t) => t.id === id);
