"""
Generate payslip PDF using ReportLab (pure Python, no system libs needed).
"""
import io
import os
import calendar
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, KeepTogether,
)
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader

# ── Colour palette ────────────────────────────────────────────
NAVY    = colors.HexColor("#1E3563")
ORANGE  = colors.HexColor("#E8821E")
LIGHT   = colors.HexColor("#F4F6FA")
GREEN   = colors.HexColor("#15966A")
RED_C   = colors.HexColor("#D2453F")
MID     = colors.HexColor("#6B7793")
WHITE   = colors.white
BLACK   = colors.HexColor("#0F1E3D")
GOLD    = colors.HexColor("#D4AF37")

W, H = A4          # 595.27 x 841.89 points
MARGIN = 18 * mm

LOGO_PATH = os.path.join(os.path.dirname(__file__), "shivlal_logo.jpeg")


def _inr(v):
    v = float(v or 0)
    return f"₹{v:,.2f}"


def _num_to_words(n):
    ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
            "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
            "Seventeen","Eighteen","Nineteen"]
    tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]

    def _below_1000(n):
        if n < 20:
            return ones[n]
        elif n < 100:
            r = tens[n // 10]
            if n % 10: r += " " + ones[n % 10]
            return r
        else:
            r = ones[n // 100] + " Hundred"
            if n % 100: r += " " + _below_1000(n % 100)
            return r

    n = int(n)
    if n == 0: return "Zero"
    lakh   = n // 100000; n %= 100000
    thou   = n // 1000;   n %= 1000
    result = ""
    if lakh:   result += _below_1000(lakh) + " Lakh "
    if thou:   result += _below_1000(thou) + " Thousand "
    if n:      result += _below_1000(n)
    return result.strip() + " Only"


def _draw_watermark(c, doc):
    """Draw the logo watermark centred on the page at 12% opacity."""
    c.saveState()
    try:
        img = ImageReader(LOGO_PATH)
        size = 220  # points (~78 mm) — large but subtle
        x = (W - size) / 2
        y = (H - size) / 2
        c.setFillAlpha(0.12)
        c.drawImage(img, x, y, width=size, height=size,
                    preserveAspectRatio=True, mask="auto")
    except Exception:
        pass  # if logo file missing, skip silently
    c.restoreState()


def generate_payslip_pdf(payslip):
    """Return BytesIO containing the PDF for one payslip."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
    )

    emp   = payslip.employee
    run   = payslip.payroll_run
    mname = calendar.month_name[run.month]

    normal = ParagraphStyle("n",  fontName="Helvetica",      fontSize=9,  leading=13, textColor=BLACK)
    small  = ParagraphStyle("s",  fontName="Helvetica",      fontSize=8,  leading=11, textColor=MID)
    bold9  = ParagraphStyle("b9", fontName="Helvetica-Bold", fontSize=9,  leading=13, textColor=BLACK)
    val_right   = ParagraphStyle("vr",  fontName="Helvetica",      fontSize=9,  alignment=TA_RIGHT, textColor=BLACK,  leading=12)
    val_right_b = ParagraphStyle("vrb", fontName="Helvetica-Bold", fontSize=9,  alignment=TA_RIGHT, textColor=GREEN,  leading=12)
    th_style    = ParagraphStyle("th",  fontName="Helvetica-Bold", fontSize=9,  textColor=WHITE, leading=12)

    story = []

    # ── Company name banner ──────────────────────────────────
    co_banner_data = [[
        Paragraph(
            "<font color='#D4AF37' size='7'>M/S</font> "
            "<font color='white' size='11'><b>SHIV LAL MANPOWER</b></font>",
            ParagraphStyle("co", fontName="Helvetica-Bold", fontSize=11,
                           textColor=WHITE, leading=16, alignment=TA_CENTER),
        ),
    ]]
    co_banner = Table(co_banner_data, colWidths=[W - 2 * MARGIN])
    co_banner.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#0A1428")),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("LINEBELOW",     (0, 0), (-1, -1), 1.5, GOLD),
    ]))
    story.append(co_banner)
    story.append(Spacer(1, 4))

    # ── Header bar (PAYSLIP title + month) ───────────────────
    header_data = [[
        Paragraph(
            "<font color='white' size='14'><b>Shiv Lal Manpower</b></font>"
            "<br/><font color='#AEB9D4' size='8'>Operations Console · Manpower Services</font>",
            ParagraphStyle("hdr", fontName="Helvetica-Bold", fontSize=14,
                           textColor=WHITE, leading=20),
        ),
        Paragraph(
            f"<font color='white' size='13'><b>PAYSLIP</b></font><br/>"
            f"<font color='#AEB9D4' size='9'>{mname} {run.year}</font>",
            ParagraphStyle("hdr2", fontName="Helvetica-Bold", fontSize=13,
                           textColor=WHITE, leading=18, alignment=TA_RIGHT),
        ),
    ]]
    header_tbl = Table(header_data, colWidths=[W - 2 * MARGIN - 120, 120])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (0, -1),  12),
        ("RIGHTPADDING",  (-1, 0), (-1, -1), 12),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 6))

    # ── Employee info block ───────────────────────────────────
    def kv(label, value):
        return [Paragraph(label, small), Paragraph(f"<b>{value or '—'}</b>", bold9)]

    site_str = emp.site.name if emp.site else "Not assigned"
    dist_str = emp.site.district.name if emp.site and emp.site.district else ""
    loc = f"{site_str}{' · ' + dist_str if dist_str else ''}"

    emp_rows = [
        kv("Employee Name", emp.full_name),
        kv("Employee Code", emp.emp_code),
        kv("Designation",   emp.designation),
        kv("Deployment",    loc),
        kv("UAN",           emp.uan or "Not registered"),
        kv("ESIC No.",      emp.esic_no or "Not registered"),
    ]

    pay_period = [
        kv("Pay Period",   f"{mname} {run.year}"),
        kv("Working Days", str(payslip.working_days)),
        kv("Days Present", str(payslip.present_days)),
        kv("Days Absent",  str(payslip.working_days - payslip.present_days)),
        kv("PAN",          emp.pan or "Not provided"),
        kv("Bank A/c",     emp.bank_account or "Not provided"),
    ]

    half       = len(emp_rows) // 2
    left_rows  = emp_rows[:half]
    right_rows = emp_rows[half:]

    def make_info_col(rows):
        t = Table([[lp, vp] for lp, vp in rows], colWidths=[55, 130])
        t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ]))
        return t

    info_data = [[make_info_col(left_rows), make_info_col(right_rows), make_info_col(pay_period)]]
    info_tbl  = Table(info_data, colWidths=[(W - 2 * MARGIN) / 3] * 3)
    info_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), LIGHT),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E7F0")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LINEAFTER",     (0, 0), (1, -1),  0.5, colors.HexColor("#D0D7E5")),
    ]))
    story.append(info_tbl)
    story.append(Spacer(1, 10))

    # ── Earnings & Deductions table ───────────────────────────
    gross   = float(payslip.basic + payslip.hra + payslip.da + payslip.other_allowances)
    pf_emp  = float(payslip.pf_employee)
    esi_emp = float(payslip.esi_employee)
    other_d = float(payslip.other_deductions)
    total_d = pf_emp + esi_emp + other_d
    net     = float(payslip.net_pay)

    earn_rows = [
        ["Basic Salary",         _inr(payslip.basic)],
        ["House Rent Allowance", _inr(payslip.hra)],
        ["Dearness Allowance",   _inr(payslip.da)],
        ["Other Allowances",     _inr(payslip.other_allowances)],
    ]
    ded_rows = [
        ["PF (Employee 12%)",    _inr(pf_emp)],
        ["ESI (Employee 0.75%)", _inr(esi_emp)],
        ["Other Deductions",     _inr(other_d)],
        ["", ""],
    ]

    cell_w = (W - 2 * MARGIN) / 2 - 3

    def make_earn_tbl(data, bg_hdr):
        t = Table(data, colWidths=[cell_w * 0.62, cell_w * 0.38])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  bg_hdr),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (0, -1),  8),
            ("RIGHTPADDING",  (-1, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS",(0, 1), (-1, -2), [WHITE, LIGHT]),
            ("BACKGROUND",    (0, -1), (-1, -1), colors.HexColor("#E8F5EF")),
            ("LINEBELOW",     (0, -1), (-1, -1), 0.8, GREEN),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E7F0")),
        ]))
        return t

    left_tbl_data  = [[Paragraph("Earnings",  th_style), Paragraph("Amount", th_style)]]
    left_tbl_data += [[Paragraph(r[0], normal), Paragraph(r[1], val_right)] for r in earn_rows]
    left_tbl_data += [[Paragraph("<b>Gross Earnings</b>", bold9), Paragraph(f"<b>{_inr(gross)}</b>", val_right_b)]]

    right_tbl_data  = [[Paragraph("Deductions", th_style), Paragraph("Amount", th_style)]]
    right_tbl_data += [[Paragraph(r[0], normal), Paragraph(r[1], val_right)] for r in ded_rows]
    right_tbl_data += [[Paragraph("<b>Total Deductions</b>", bold9),
                        Paragraph(f"<b>{_inr(total_d)}</b>",
                                  ParagraphStyle("red", fontName="Helvetica-Bold", fontSize=9,
                                                 alignment=TA_RIGHT, textColor=RED_C))]]

    earn_tbl = make_earn_tbl(left_tbl_data,  NAVY)
    ded_tbl  = make_earn_tbl(right_tbl_data, colors.HexColor("#7B1FA2"))

    combined = Table([[earn_tbl, Spacer(6, 1), ded_tbl]], colWidths=[cell_w, 6, cell_w])
    combined.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(combined)
    story.append(Spacer(1, 10))

    # ── Net Pay box ───────────────────────────────────────────
    net_data = [[
        Paragraph("NET PAY", ParagraphStyle("np",  fontName="Helvetica-Bold", fontSize=11, textColor=WHITE)),
        Paragraph(_inr(net), ParagraphStyle("npv", fontName="Helvetica-Bold", fontSize=14, textColor=WHITE,
                                             alignment=TA_RIGHT)),
    ]]
    net_tbl = Table(net_data, colWidths=[W - 2 * MARGIN - 140, 140])
    net_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREEN),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (0, -1),  14),
        ("RIGHTPADDING",  (-1, 0), (-1, -1), 14),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS",(0, 0), (-1, -1), [6, 6, 6, 6]),
    ]))
    story.append(net_tbl)
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        f"<i>Amount in words: <b>{_num_to_words(int(net))}</b></i>",
        ParagraphStyle("words", fontName="Helvetica-Oblique", fontSize=8.5, textColor=MID, leading=12),
    ))
    story.append(Spacer(1, 14))

    # ── Footer ────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E7F0")))
    story.append(Spacer(1, 6))
    footer_data = [[
        Paragraph(
            "This is a system-generated payslip and does not require a signature.",
            ParagraphStyle("ft",  fontName="Helvetica-Oblique", fontSize=7.5, textColor=MID),
        ),
        Paragraph(
            f"M/S Shiv Lal Manpower · {mname} {run.year}",
            ParagraphStyle("ftr", fontName="Helvetica", fontSize=7.5, textColor=MID, alignment=TA_RIGHT),
        ),
    ]]
    footer_tbl = Table(footer_data, colWidths=[(W - 2 * MARGIN) / 2] * 2)
    footer_tbl.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_tbl)

    doc.build(story, onFirstPage=_draw_watermark, onLaterPages=_draw_watermark)
    buf.seek(0)
    return buf
