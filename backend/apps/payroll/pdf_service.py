"""
Generate payslip PDF using ReportLab.
Uses DejaVu Sans (bundled in fonts/) for ₹ (U+20B9) support — base-14 fonts lack it.
"""
import io
import os
import calendar

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image as RLImage,
)

# ── Font registration ──────────────────────────────────────────
_FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")
pdfmetrics.registerFont(TTFont("DejaVu",      os.path.join(_FONTS_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", os.path.join(_FONTS_DIR, "DejaVuSans-Bold.ttf")))

# ── Colours ────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1E3563")
LIGHT  = colors.HexColor("#F4F6FA")
GREEN  = colors.HexColor("#15966A")
RED_C  = colors.HexColor("#D2453F")
MID    = colors.HexColor("#6B7793")
WHITE  = colors.white
BLACK  = colors.HexColor("#0F1E3D")
GOLD   = colors.HexColor("#D4AF37")
PURPLE = colors.HexColor("#7B1FA2")

W, H   = A4
MARGIN = 18 * mm

LOGO_PATH = os.path.join(os.path.dirname(__file__), "shivlal.png")
QR_URL    = "https://admin.shivlalmanpower.com/"


def _inr(v):
    return f"₹{float(v or 0):,.2f}"


def _num_to_words(n):
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _sub1k(x):
        if x < 20:  return ones[x]
        if x < 100: return tens[x // 10] + (" " + ones[x % 10] if x % 10 else "")
        return ones[x // 100] + " Hundred" + (" " + _sub1k(x % 100) if x % 100 else "")

    n = int(n)
    if n == 0: return "Zero Only"
    parts = []
    if n >= 100000: parts.append(_sub1k(n // 100000) + " Lakh");    n %= 100000
    if n >= 1000:   parts.append(_sub1k(n // 1000)   + " Thousand"); n %= 1000
    if n:           parts.append(_sub1k(n))
    return " ".join(parts) + " Only"


def _logo_buf(max_px=220):
    """Return a BytesIO of the logo resized to max_px on the long side."""
    try:
        from PIL import Image as PILImage
        img = PILImage.open(LOGO_PATH).convert("RGBA")
        img.thumbnail((max_px, max_px), PILImage.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf
    except Exception:
        return None


def _make_qr(url, pts=54):
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=4, border=2,
                           error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1E3563", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return RLImage(buf, width=pts, height=pts)
    except Exception:
        return None


_LOGO_BUF = None  # cached resized logo bytes

def _get_logo_buf():
    global _LOGO_BUF
    if _LOGO_BUF is None:
        _LOGO_BUF = _logo_buf(max_px=220)
    return _LOGO_BUF


def _draw_watermark(c, doc):
    c.saveState()
    try:
        buf = _get_logo_buf()
        if buf:
            buf.seek(0)
            img = ImageReader(buf)
        else:
            img = ImageReader(LOGO_PATH)
        sz = 210
        c.setFillAlpha(0.10)
        c.drawImage(img, (W - sz) / 2, (H - sz) / 2, width=sz, height=sz,
                    preserveAspectRatio=True, mask="auto")
    except Exception:
        pass
    c.restoreState()


def generate_payslip_pdf(payslip):
    """Return BytesIO containing the A4 payslip PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)

    emp   = payslip.employee
    run   = payslip.payroll_run
    mname = calendar.month_name[run.month]

    # ── Paragraph style helper ─────────────────────────────────
    def _s(name, font="DejaVu", size=9, color=BLACK, align=0, leading=13, **kw):
        return ParagraphStyle(name, fontName=font, fontSize=size, textColor=color,
                              leading=leading, alignment=align, **kw)

    sml  = _s("sml",  size=8,  color=MID,   leading=11)
    nrm  = _s("nrm")
    bld  = _s("bld",  font="DejaVu-Bold")
    vr   = _s("vr",   align=TA_RIGHT)
    vrg  = _s("vrg",  font="DejaVu-Bold", align=TA_RIGHT, color=GREEN)
    vrr  = _s("vrr",  font="DejaVu-Bold", align=TA_RIGHT, color=RED_C)
    th   = _s("th",   font="DejaVu-Bold", color=WHITE, leading=12)

    story = []

    # ── Header: [logo | company + payslip | QR] ───────────────
    # Logo is 1080×1350 RGBA (portrait, ratio 0.8). Display at 46×58 so it
    # fits the header height without distortion. Transparent bg shows navy.
    logo_img_w, logo_img_h = 46, 58
    logo_col_w, qr_w = 56, 54
    mid_w = W - 2 * MARGIN - logo_col_w - qr_w - 14

    logo_buf = _get_logo_buf()
    logo_cell = RLImage(logo_buf, width=logo_img_w, height=logo_img_h) \
        if logo_buf else Spacer(logo_img_w, logo_img_h)
    qr_cell = _make_qr(QR_URL, qr_w) or Spacer(qr_w, qr_w)

    centre_tbl = Table([
        [Paragraph(
            "<font color='#D4AF37'>M/S</font>  SHIV LAL MANPOWER",
            _s("cn", font="DejaVu-Bold", size=13, color=WHITE,
               align=TA_CENTER, leading=17),
        )],
        [Paragraph(
            f"<b><font size='14'>PAYSLIP</font></b>"
            f"  <font size='9' color='#AEB9D4'>{mname} {run.year}</font>",
            _s("ps", font="DejaVu-Bold", size=13, color=WHITE,
               align=TA_CENTER, leading=19),
        )],
    ], colWidths=[mid_w])
    centre_tbl.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))

    hdr = Table(
        [[logo_cell, centre_tbl, qr_cell]],
        colWidths=[logo_col_w, mid_w, qr_w + 6],
    )
    hdr.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (0, 0),   8),
        ("LEFTPADDING",   (1, 0), (1, 0),   0),
        ("RIGHTPADDING",  (1, 0), (1, 0),   0),
        ("RIGHTPADDING",  (-1, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW",     (0, 0), (-1, -1), 1.5, GOLD),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 8))

    # ── Employee / pay-period info grid ───────────────────────
    def kv(label, val):
        return [Paragraph(label, sml), Paragraph(f"<b>{val or '—'}</b>", bld)]

    site_str = emp.site.name if emp.site else "Not assigned"
    dist_str = emp.site.district.name if emp.site and emp.site.district else ""
    loc      = site_str + (" · " + dist_str if dist_str else "")

    col_a = [kv("Employee Name", emp.full_name),
             kv("Employee Code", emp.emp_code),
             kv("Designation",   emp.designation)]
    col_b = [kv("Deployment",    loc),
             kv("UAN",           emp.uan       or "Not registered"),
             kv("ESIC No.",      emp.esic_no   or "Not registered")]
    col_c = [kv("Pay Period",   f"{mname} {run.year}"),
             kv("Days Present",  str(payslip.present_days)),
             kv("Days Absent",   str(payslip.working_days - payslip.present_days)),
             kv("PAN",           emp.pan          or "Not provided"),
             kv("Bank A/c",      emp.bank_account or "Not provided")]

    def _info_col(rows):
        t = Table([[a, b] for a, b in rows], colWidths=[58, None])
        t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        return t

    col_w = (W - 2 * MARGIN) / 3
    info = Table([[_info_col(col_a), _info_col(col_b), _info_col(col_c)]],
                 colWidths=[col_w, col_w, col_w])
    info.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), LIGHT),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E7F0")),
        ("LINEAFTER",     (0, 0), (1, -1),  0.5, colors.HexColor("#D0D7E5")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(info)
    story.append(Spacer(1, 10))

    # ── Salary figures ────────────────────────────────────────
    basic   = float(payslip.basic)
    hra     = float(payslip.hra)
    da      = float(payslip.da)
    bonus   = float(payslip.bonus)   # 8.33% of struct.basic (PF regime) or 0 (TDS regime)
    pf_emp  = float(payslip.pf_employee)
    esi_emp = float(payslip.esi_employee)
    tds_amt = float(payslip.tds)
    other_d = float(payslip.other_deductions)
    net     = float(payslip.net_pay)

    # Employer contributions (for CTC display, not saved in DB)
    pf_er  = round(basic * 0.12,   2)
    esi_er = round(basic * 0.0325, 2)

    # Regime: bonus > 0 means PF/ESIC mode; bonus == 0 means TDS mode
    pf_mode = bonus > 0

    if pf_mode:
        # CTC Gross = Basic + HRA + DA + Bonus + Employer PF + Employer ESIC
        gross_ctc = basic + hra + da + bonus + pf_er + esi_er
        # Gross Deduction = all 4 PF/ESIC contributions
        total_d   = pf_emp + pf_er + esi_emp + esi_er + other_d

        earn_rows = [
            ("Basic Salary",                _inr(basic)),
            ("House Rent Allowance",        _inr(hra)),
        ]
        if da > 0:
            earn_rows.append(("Dearness Allowance", _inr(da)))
        earn_rows.append(("Other  (Bonus @ 8.33% of Basic)", _inr(bonus)))

        ded_rows = [
            ("EPF – Employee (12% of Basic)",    _inr(pf_emp)),
            ("EPF – Employer (12% of Basic)",    _inr(pf_er)),
            ("ESIC – Employee (0.75% of Basic)", _inr(esi_emp)),
            ("ESIC – Employer (3.25% of Basic)", _inr(esi_er)),
        ]
        if other_d:
            ded_rows.append(("Other Deductions", _inr(other_d)))

        gross_label = "Gross Earning (CTC)"
        ded_label   = "Gross Deduction"
        regime_txt  = "Salary Regime: EPF & ESIC applicable (Basic ≤ ₹30,000) — TDS not deducted."
        regime_clr  = colors.HexColor("#1565C0")
    else:
        # TDS mode: standard employee gross (no employer contributions, no bonus)
        gross_ctc = basic + hra + da
        total_d   = tds_amt + other_d

        earn_rows = [
            ("Basic Salary",         _inr(basic)),
            ("House Rent Allowance", _inr(hra)),
        ]
        if da > 0:
            earn_rows.append(("Dearness Allowance", _inr(da)))

        ded_rows = [("TDS – Income Tax (10% of Basic)", _inr(tds_amt))]
        if other_d:
            ded_rows.append(("Other Deductions", _inr(other_d)))

        gross_label = "Gross Earnings"
        ded_label   = "Total Deductions"
        regime_txt  = "Salary Regime: TDS applicable (Basic > ₹30,000) — EPF & ESIC not deducted."
        regime_clr  = PURPLE

    # Pad both sides to equal row count so the tables align
    max_rows = max(len(earn_rows), len(ded_rows))
    while len(earn_rows) < max_rows: earn_rows.append(("", ""))
    while len(ded_rows)  < max_rows: ded_rows.append(("", ""))

    cw = (W - 2 * MARGIN) / 2 - 3

    def _salary_tbl(rows, total_label, total_val, total_style, hdr_color):
        data  = [[Paragraph("Component", th), Paragraph("Amount", th)]]
        data += [[Paragraph(l, nrm), Paragraph(v, vr)] for l, v in rows]
        data += [[Paragraph(f"<b>{total_label}</b>", bld),
                  Paragraph(f"<b>{total_val}</b>", total_style)]]
        t = Table(data, colWidths=[cw * 0.63, cw * 0.37])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  hdr_color),
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

    earn_tbl = _salary_tbl(earn_rows, gross_label, _inr(gross_ctc), vrg, NAVY)
    ded_tbl  = _salary_tbl(ded_rows,  ded_label,   _inr(total_d),   vrr, PURPLE)

    cols = Table([[earn_tbl, Spacer(6, 1), ded_tbl]], colWidths=[cw, 6, cw])
    cols.setStyle(TableStyle([("TOPPADDING",    (0, 0), (-1, -1), 0),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                               ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING",  (0, 0), (-1, -1), 0)]))
    story.append(cols)
    story.append(Spacer(1, 10))

    # ── Net Pay banner ─────────────────────────────────────────
    net_tbl = Table(
        [[Paragraph("NET PAY",
                    _s("npl", font="DejaVu-Bold", size=11, color=WHITE)),
          Paragraph(_inr(net),
                    _s("npv", font="DejaVu-Bold", size=14, color=WHITE, align=TA_RIGHT))]],
        colWidths=[W - 2 * MARGIN - 150, 150],
    )
    net_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREEN),
        ("TOPPADDING",    (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
        ("LEFTPADDING",   (0, 0), (0, 0),   14),
        ("RIGHTPADDING",  (-1, 0), (-1, -1), 14),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(net_tbl)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"Amount in words: <b>{_num_to_words(int(net))}</b>",
        _s("words", size=8.5, color=MID, leading=12),
    ))
    story.append(Spacer(1, 5))
    story.append(Paragraph(regime_txt, _s("regime", size=8, color=regime_clr, leading=11)))
    story.append(Spacer(1, 10))

    # ── Footer ─────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E7F0")))
    story.append(Spacer(1, 5))
    story.append(Table(
        [[Paragraph("This is a system-generated payslip and does not require a signature.",
                    _s("ftl", size=7.5, color=MID)),
          Paragraph(f"M/S Shiv Lal Manpower · {mname} {run.year}",
                    _s("ftr", size=7.5, color=MID, align=TA_RIGHT))]],
        colWidths=[(W - 2 * MARGIN) / 2] * 2,
        style=TableStyle([("TOPPADDING",    (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                           ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING",  (0, 0), (-1, -1), 0)]),
    ))

    doc.build(story, onFirstPage=_draw_watermark, onLaterPages=_draw_watermark)
    buf.seek(0)
    return buf
