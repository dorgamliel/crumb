import type { ImageAsset, ImageCredit } from "../types";

// Every photograph is stored locally in /public/img in two widths (720 and up to 1400).
// Credits: Wikimedia Commons and rawpixel entries come from the file's own metadata page.
// Unsplash photos were chosen by their image ID; the photographer name was not verified
// for this prototype, so it is left out rather than guessed.

const unsplash: ImageCredit = { source: "Unsplash", license: "Unsplash License" };

const img = (
  key: string,
  width: number,
  height: number,
  alt: string,
  credit: ImageCredit,
  focus?: string,
): ImageAsset => ({ key, width, height, alt, credit, focus });

export const images: Record<string, ImageAsset> = Object.fromEntries(
  [
    img("sourdough", 1400, 934, "כיכר לחם מחמצת עגולה עם קרום כהה וחריצים", unsplash),
    img("tangzhong", 1280, 1707, "לחם חלב יפני פרוס על קרש עץ, עם פירור לבן ורך", {
      author: "ChrisHamby",
      source: "Wikimedia Commons",
      license: "CC BY-SA 2.0",
      url: "https://commons.wikimedia.org/w/index.php?curid=96352588",
    }, "center 45%"),
    img("coffee", 1400, 2100, "שתי כוסות קפה עם ציור בחלב על שולחן עץ, בין עציצים", unsplash, "center 60%"),
    img("coffee-beans", 1400, 1068, "פולי קפה קלויים בתקריב", unsplash),
    img("extraction", 1400, 934, "חליטת קפה בפילטר: קומקום עם זרבובית דקה מעל כלי זכוכית", unsplash, "40% center"),
    img("espresso-tools", 1400, 934, "ידית אספרסו, קפה טחון וכוס קפה על משטח עץ", unsplash),
    img("gluten", 1400, 934, "ידיים לשות בצק על משטח מקומח", unsplash),
    img("butter", 1400, 934, "חמאה בגוש ובקוביות על לוח שיש", unsplash),
    img("fermentation", 1280, 1920, "צנצנת זכוכית עם מחמצת תוססת ומלאת בועות", {
      author: "Jeuwre",
      source: "Wikimedia Commons",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/w/index.php?curid=94133831",
    }, "center 60%"),
    img("eggs", 1400, 934, "ידיים מחזיקות קערה מלאה ביצים חומות", unsplash),
    img("hydration", 1400, 934, "כיכר לחם כהה פרוסה, ורואים את מבנה הפירור", unsplash),
    img("breads", 1400, 931, "כיכרות לחם כפרי עם שיבולי חיטה", unsplash),
    img("tomatoes", 1400, 2014, "עגבניות אדומות על אשכול, עם טיפות מים, על רקע כהה", unsplash, "center 40%"),
    img("tomato-pile", 1400, 935, "ערמה של עגבניות אדומות בשלות", unsplash),
    img("tomato-salad", 1400, 2100, "סלט עגבניות שרי עם גבינה לבנה ובזיליקום", unsplash),
    img("olive-oil", 1400, 1943, "בקבוק שמן זית זהוב ליד זיתים על משטח כהה", unsplash, "center 35%"),
    img("emulsions", 1280, 853, "מטרפה בתוך מיונז ביתי סמיך וחלק", {
      author: "Jason Terk",
      source: "Wikimedia Commons",
      license: "CC BY 2.0",
      url: "https://commons.wikimedia.org/w/index.php?curid=35344373",
    }),
    img("spices", 1400, 934, "תבלינים שלמים וטחונים פזורים על משטח לבן: צ׳ילי, קינמון, כורכום", unsplash),
    img("spice-spoons", 1400, 2100, "כפות מתכת מלאות בתבלינים שונים בשורה", unsplash),
    img("ground-spices", 1400, 934, "כורכום, פפריקה ותבלינים טחונים על רקע כחול כהה", unsplash),
    img("acidity", 1400, 2100, "פרוסות של אשכוליות, תפוזים ולימונים בצבעים עזים", unsplash),
    img("yogurt", 1400, 2100, "צנצנות קטנות של יוגורט עם תותים", unsplash),
    img("starch", 1024, 768, "גרגירי אורז לבנים לא מבושלים", {
      source: "rawpixel",
      license: "CC0",
      url: "https://www.rawpixel.com/image/5922922/photo-image-public-domain-food-free",
    }),
    img("pickles", 1280, 850, "מלפפונים חמוצים בכלי זכוכית", {
      author: "Nikodem Nijaki",
      source: "Wikimedia Commons",
      license: "CC BY-SA 3.0",
      url: "https://commons.wikimedia.org/w/index.php?curid=16920310",
    }),
    img("pasta", 1400, 2100, "ספגטי יבש בצנצנת זכוכית ולצדו קנים של טליאטלה", unsplash),
    img("pasta-water", 1400, 1400, "צלחת פנה ברוטב עגבניות מבריק", unsplash),
    img("browning", 1400, 2097, "עוף צלוי בעור זהוב ופריך במחבת ברזל", unsplash, "center 55%"),
    img("seared", 1400, 1751, "נתחי בשר צרובים ותפוחי אדמה צלויים על מגש ברזל", unsplash),
    img("cheese", 1400, 935, "גבינה כחולה בחיתוך, עם תאנה ואגוזי מלך", unsplash),
    img("pizza", 1400, 934, "פיצה עם שוליים חרוכים ועגבניות שרי, פרוסה למשולשים", unsplash),
    img("pepper", 1280, 960, "גרגירי פלפל שחור מקומטים בתקריב", {
      author: "Xitop753",
      source: "Wikimedia Commons",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/w/index.php?curid=70696866",
    }),
    img("caramel", 1280, 1024, "פלאן אישי מכוסה ברוטב קרמל ענברי", {
      author: "António Ribeiro",
      source: "Wikimedia Commons",
      license: "CC0",
      url: "https://commons.wikimedia.org/w/index.php?curid=188704078",
    }),
    img("lamination", 1400, 1120, "קרואסונים זהובים מאובקים באבקת סוכר", unsplash),
  ].map((asset) => [asset.key, asset]),
);
