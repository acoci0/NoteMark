from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
import fitz
pdfmetrics.registerFont(TTFont('Arial','/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
styles=getSampleStyleSheet()
for name in ['Normal','Title','Heading1','Heading2','Heading3']:
 styles[name].fontName='ArialBold' if name!='Normal' else 'Arial'
 styles[name].textColor=colors.HexColor('#172b43')
styles['Normal'].fontSize=9.5; styles['Normal'].leading=14; styles['Normal'].spaceAfter=8
styles['Title'].fontSize=22; styles['Title'].leading=28; styles['Title'].spaceAfter=18
styles['Heading2'].fontSize=14; styles['Heading2'].leading=19;styles['Heading2'].spaceBefore=14;styles['Heading2'].spaceAfter=8
styles['Heading3'].fontSize=11;styles['Heading3'].leading=16;styles['Heading3'].spaceBefore=10;styles['Heading3'].spaceAfter=7
styles.add(ParagraphStyle(name='BulletTR',parent=styles['Normal'],leftIndent=12,firstLineIndent=-9))
source=Path('security/pentest-2026-10-10/REPORT.md').read_text()
source=source.replace('—','-').replace('–','-')
flow=[]
for block in source.split('\n\n'):
 block=block.strip()
 if not block:continue
 if block.startswith('# '):
  flow.append(Paragraph('NotMarket<br/>Yerel Güvenlik Testi Raporu',styles['Title']))
  flow.append(Paragraph('10 Ekim 2026 | Kaynak kod incelemesi ve izole ortam testleri',styles['Normal']))
 elif block.startswith('### '):flow.append(Paragraph(escape(block[4:]),styles['Heading3']))
 elif block.startswith('## '):flow.append(Paragraph(escape(block[3:]),styles['Heading2']))
 elif block.startswith('- '):
  for line in block.split('\n'):
   flow.append(Paragraph('• '+escape(line.removeprefix('- ')),styles['BulletTR']))
 else:flow.append(Paragraph(escape(block).replace('\n','<br/>'),styles['Normal']))
def footer(canvas,doc):
 canvas.saveState();canvas.setStrokeColor(colors.HexColor('#d8e0e8'));canvas.line(42,42,A4[0]-42,42)
 canvas.setFont('Arial',8);canvas.setFillColor(colors.HexColor('#667788'))
 canvas.drawString(42,29,'NotMarket | Sınırlı yerel güvenlik testi');canvas.drawRightString(A4[0]-42,29,str(doc.page));canvas.restoreState()
path=Path('output/pdf/notmarket-sizma-testi-2026-10-10.pdf')
SimpleDocTemplate(str(path),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=56,title='NotMarket Sızma Testi Raporu - 10 Ekim 2026',author='Codex').build(flow,onFirstPage=footer,onLaterPages=footer)
doc=fitz.open(path)
print('Pages:',len(doc))
for i,page in enumerate(doc):
 page.get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(f'tmp/pdfs/page-{i+1}.png')
 print('Page',i+1,'characters',len(page.get_text()))
