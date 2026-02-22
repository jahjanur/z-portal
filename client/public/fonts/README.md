# PDF fonts (optional)

The "Send Offer" PDF currently uses the default **Helvetica** font so generation is reliable.

**Note:** Dropping raw `.ttf` files (e.g. Inter from Google Fonts) into this folder is **not** used: jsPDF does not support those TTF files directly and they cause "No unicode cmap" and PDF download errors. To use a custom font like Inter with jsPDF, you must convert it with the [jsPDF font converter](https://raw.githack.com/parallax/jsPDF/master/fontconverter/fontconverter.html), then integrate the generated script into the app (see `client/src/utils/pdf/registerInterFont.ts`).
