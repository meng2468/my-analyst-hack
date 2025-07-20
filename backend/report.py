import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image)
from reportlab.lib import colors
from reportlab.lib.units import mm
import matplotlib.pyplot as plt
import seaborn as sns
import io
import os
from reportlab.platypus import PageBreak

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = RIGHT_MARGIN = 18 * mm
MAX_TABLE_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
MAX_TABLE_COLS = 5  # Show up to this many columns at once in a table

def split_columns(df, max_cols):
    """Yield DataFrame slices with up to max_cols columns at a time."""
    total = df.shape[1]
    for start_col in range(0, total, max_cols):
        yield df.iloc[:, start_col:start_col+max_cols], start_col

def styled_table(data, col_widths=None):
    tbl = Table(data, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#295773')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#eef3fb')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#eef3fb'), colors.white]),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#9db4c0')),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return tbl

def fit_col_widths(df, max_width=MAX_TABLE_WIDTH):
    n = df.shape[1]
    base_width = max_width / n
    return [base_width] * n

def generate_pdf_report(csv_filename, pdf_filename, summary:str):
    df = pd.read_csv(csv_filename)
    dataset_name = os.path.basename(csv_filename)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='MyHeading', fontName='Helvetica-Bold', fontSize=16, textColor=colors.HexColor('#07354f'), spaceAfter=10, spaceBefore=8))
    styles.add(ParagraphStyle(
        name='MySubtitle', fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#22546a'), spaceAfter=12, spaceBefore=0))
    styles.add(ParagraphStyle(
        name='MySection', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#2a4153'), spaceAfter=6, spaceBefore=12))
    styles.add(ParagraphStyle(
        name='MyNorm', fontName='Helvetica', fontSize=9, textColor=colors.HexColor('#222222'), spaceAfter=6, spaceBefore=0))

    story = []

    # Title and dataset name
    story.append(Paragraph("Data Analysis Report", styles['MyHeading']))
    story.append(Paragraph(f"Dataset: <b>{dataset_name}</b>", styles['MySubtitle']))

    # --------- SUMMARY (pretty printed) ---------
    # Add a new style for summary box
    styles.add(ParagraphStyle(
        name='SummaryBox',
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#07354f'),
        backColor=colors.HexColor('#eef3fb'),
        borderColor=colors.HexColor('#bdd8e6'),
        borderWidth=1,
        borderPadding=8,
        leading=14,
        leftIndent=0,  # no indent - full width
        rightIndent=0,
        spaceBefore=10,
        spaceAfter=12,
    ))
    story.append(Paragraph(summary, styles['SummaryBox']))


    # General info
    story.append(Paragraph(f"Rows: <b>{df.shape[0]}</b>, Columns: <b>{df.shape[1]}</b>", styles['MyNorm']))
    story.append(Spacer(1, 8))

    # --------- GRAPHS AT THE TOP ---------
    story.append(Paragraph("Key Distributions", styles['MySection']))
    num_cols = df.select_dtypes(include='number').columns[:3]
    if len(num_cols) == 0:
        story.append(Paragraph("No numerical columns available for plotting.", styles['MyNorm']))
    else:
        for col in num_cols:
            story.append(Paragraph(f"Distribution of <b>{col}</b>", styles['MyNorm']))
            plt.figure(figsize=(4, 2))
            sns.histplot(df[col].dropna(), color="#295773", kde=True)
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight')
            plt.close()
            buf.seek(0)
            img = Image(buf, width=120*mm, height=50*mm)
            story.append(img)
            story.append(Spacer(1, 8))
    story.append(Spacer(1, 16))
    story.append(PageBreak())

    # --------- DATA HEAD ---------
    story.append(Paragraph("Sample Data", styles['MySection']))
    for chunk, start in split_columns(df.head(5), MAX_TABLE_COLS):
        data = [list(chunk.columns)] + chunk.values.tolist()
        col_widths = fit_col_widths(chunk)
        story.append(styled_table(data, col_widths=col_widths))
        if df.shape[1] > MAX_TABLE_COLS:
            story.append(Paragraph(f"<font size=8 color='#5d778b'>Columns {start+1}-{start+len(chunk.columns)} of {df.shape[1]}</font>", styles['MyNorm']))
        story.append(Spacer(1, 5))

    story.append(PageBreak())
    # --------- STATISTICS ---------
    story.append(Paragraph("Statistical Summary", styles['MySection']))
    desc = df.describe(include='all').transpose().reset_index()
    for chunk, start in split_columns(desc, MAX_TABLE_COLS):
        data = [list(chunk.columns)] + chunk.values.tolist()
        col_widths = fit_col_widths(chunk)
        story.append(styled_table(data, col_widths=col_widths))
        if desc.shape[1] > MAX_TABLE_COLS:
            story.append(Paragraph(f"<font size=8 color='#5d778b'>Columns {start+1}-{start+len(chunk.columns)} of {desc.shape[1]}</font>", styles['MyNorm']))
        story.append(Spacer(1, 5))

    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        rightMargin=RIGHT_MARGIN, leftMargin=LEFT_MARGIN,
        topMargin=16*mm, bottomMargin=16*mm
    )
    doc.build(story)

if __name__ == '__main__':
    generate_pdf_report('airline.csv', 'airline_report.pdf')
    print("PDF report generated: airline_report.pdf")
