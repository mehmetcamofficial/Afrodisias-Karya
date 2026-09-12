from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from pathlib import Path

out = Path("public/reports/lot-26-004-sample-analysis.pdf")
out.parent.mkdir(parents=True, exist_ok=True)
font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("DejaVu", font))
pdfmetrics.registerFont(TTFont("DejaVuBold", bold))
c = canvas.Canvas(str(out), pagesize=A4)
w, h = A4
c.setFillColor(HexColor("#10241b")); c.rect(0, 0, w, h, fill=1, stroke=0)
c.setFillColor(HexColor("#c7a04b")); c.setFont("DejaVuBold", 12); c.drawString(52, h-58, "ALTIN DAL")
c.setFillColor(HexColor("#f0eadf")); c.setFont("DejaVu", 8); c.drawString(52, h-73, "APHRODISIAS ESTATE - KARACASU / AYDIN")
c.setFont("DejaVu", 10); c.setFillColor(HexColor("#c7a04b")); c.drawString(52, h-125, "ORNEK BELGE - LABORATUVAR SERTIFIKASI DEGILDIR")
c.setFillColor(HexColor("#f0eadf")); c.setFont("DejaVuBold", 26); c.drawString(52, h-165, "Lot 26-004 Analiz Ozeti")
rows = [("Hasat donemi", "Ekim 2026"), ("Bahce parseli", "Ataeymir-Bati"), ("Sikim", "24 C altinda soguk sikim"), ("Ornek asitlik", "%0.28"), ("Polifenol", "Gercek analiz sonrasi eklenecek"), ("Durum", "On bilgi / tasarim ornegi")]
y=h-225
for label, value in rows:
    c.setStrokeColor(HexColor("#ffffff22")); c.line(52,y-12,w-52,y-12)
    c.setFillColor(HexColor("#aeb8b1")); c.setFont("DejaVu", 9); c.drawString(52,y,label.upper())
    c.setFillColor(HexColor("#f0eadf")); c.setFont("DejaVuBold", 11); c.drawRightString(w-52,y,value)
    y-=48
c.setFillColor(HexColor("#aeb8b1")); c.setFont("DejaVu", 8); c.drawString(52,45,"Gercek laboratuvar raporu tamamlandiginda bu ornek belge kaldirilmalidir.")
c.save()
