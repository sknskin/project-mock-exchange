#!/usr/bin/env python3
"""
VirtuEx - 프로젝트 기획서 PDF 생성 스크립트
다이어그램, 그래프, 프로젝트 구조 등을 포함한 종합 기획서를 생성합니다.
"""

import os
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle, Group
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker

WIDTH, HEIGHT = A4

# ─── Color Palette ───
PRIMARY = colors.HexColor('#1a73e8')
SECONDARY = colors.HexColor('#34a853')
ACCENT = colors.HexColor('#ea4335')
DARK = colors.HexColor('#202124')
LIGHT_BG = colors.HexColor('#f8f9fa')
LIGHT_BORDER = colors.HexColor('#dadce0')
ORANGE = colors.HexColor('#ff9800')
PURPLE = colors.HexColor('#9c27b0')
TEAL = colors.HexColor('#009688')
PINK = colors.HexColor('#e91e63')


def get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        'CoverTitle', parent=styles['Title'],
        fontSize=36, textColor=PRIMARY, spaceAfter=10, alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'CoverSub', parent=styles['Normal'],
        fontSize=16, textColor=DARK, alignment=TA_CENTER, spaceAfter=6,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'SectionTitle', parent=styles['Heading1'],
        fontSize=22, textColor=PRIMARY, spaceBefore=20, spaceAfter=12,
        fontName='Helvetica-Bold', borderWidth=0, borderPadding=0,
    ))
    styles.add(ParagraphStyle(
        'SubSection', parent=styles['Heading2'],
        fontSize=16, textColor=DARK, spaceBefore=14, spaceAfter=8,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'BodyText2', parent=styles['Normal'],
        fontSize=11, textColor=DARK, spaceAfter=8, leading=16,
        alignment=TA_JUSTIFY, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'SmallNote', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#5f6368'), spaceAfter=4,
        fontName='Helvetica-Oblique'
    ))
    styles.add(ParagraphStyle(
        'CodeBlock', parent=styles['Code'],
        fontSize=9, textColor=DARK, backColor=LIGHT_BG,
        borderWidth=1, borderColor=LIGHT_BORDER, borderPadding=8,
        spaceAfter=10, leading=13, fontName='Courier'
    ))
    return styles


def draw_rounded_rect(d, x, y, w, h, fill_color, label, label_color=colors.white, font_size=10, rx=5):
    """Draw a rounded-corner rectangle with centered label."""
    d.add(Rect(x, y, w, h, fillColor=fill_color, strokeColor=None, rx=rx, ry=rx))
    d.add(String(x + w/2, y + h/2 - font_size/3, label,
                 textAnchor='middle', fontSize=font_size, fillColor=label_color,
                 fontName='Helvetica-Bold'))


def draw_arrow(d, x1, y1, x2, y2, color=DARK, width=1):
    """Draw a line with arrowhead."""
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=width))
    angle = math.atan2(y2 - y1, x2 - x1)
    arrow_len = 6
    ax1 = x2 - arrow_len * math.cos(angle - 0.4)
    ay1 = y2 - arrow_len * math.sin(angle - 0.4)
    ax2 = x2 - arrow_len * math.cos(angle + 0.4)
    ay2 = y2 - arrow_len * math.sin(angle + 0.4)
    d.add(Polygon([x2, y2, ax1, ay1, ax2, ay2], fillColor=color, strokeColor=None))


def create_architecture_diagram():
    """Create the system architecture diagram."""
    d = Drawing(500, 380)
    d.add(Rect(0, 0, 500, 380, fillColor=colors.HexColor('#fafafa'), strokeColor=None))

    # Title
    d.add(String(250, 360, 'System Architecture', textAnchor='middle',
                 fontSize=14, fillColor=DARK, fontName='Helvetica-Bold'))

    # Client layer
    draw_rounded_rect(d, 190, 310, 120, 35, colors.HexColor('#455a64'), 'Client (Next.js)', rx=8)

    # API Gateway
    draw_rounded_rect(d, 160, 250, 180, 35, PRIMARY, 'API Gateway :3000', rx=8)
    draw_arrow(d, 250, 310, 250, 287, PRIMARY)

    # Services row 1
    svc_y = 175
    services_r1 = [
        (20, 'User/Auth\n:3007', colors.HexColor('#1565c0')),
        (140, 'Market Data\n:3001', SECONDARY),
        (260, 'Order Engine\n:3002', ACCENT),
        (380, 'Portfolio\n:3003', ORANGE),
    ]
    for sx, label, col in services_r1:
        draw_rounded_rect(d, sx, svc_y, 110, 45, col, label.split('\n')[0], font_size=9, rx=6)
        d.add(String(sx + 55, svc_y + 8, label.split('\n')[1] if '\n' in label else '',
                     textAnchor='middle', fontSize=8, fillColor=colors.HexColor('#ffffffcc'),
                     fontName='Helvetica'))

    # Arrows from gateway to services
    for sx in [75, 195, 315, 435]:
        draw_arrow(d, 250, 250, sx, 222, colors.HexColor('#90a4ae'))

    # Services row 2 (skeleton)
    svc_y2 = 100
    services_r2 = [
        (80, 'Notification\n:3004', PURPLE),
        (210, 'Chat\n:3005', TEAL),
        (340, 'AI Service\n:3006', PINK),
    ]
    for sx, label, col in services_r2:
        draw_rounded_rect(d, sx, svc_y2, 110, 40, col, label.split('\n')[0], font_size=9, rx=6)
        d.add(String(sx + 55, svc_y2 + 6, label.split('\n')[1],
                     textAnchor='middle', fontSize=8, fillColor=colors.HexColor('#ffffffcc'),
                     fontName='Helvetica'))
        # Dashed effect - lighter
        d.add(Rect(sx+2, svc_y2+2, 106, 36, fillColor=None,
                   strokeColor=colors.HexColor('#ffffff44'), strokeWidth=1, rx=5, ry=5))

    # Infrastructure
    infra_y = 25
    draw_rounded_rect(d, 10, infra_y, 100, 35, colors.HexColor('#37474f'), 'PostgreSQL', font_size=9, rx=6)
    draw_rounded_rect(d, 130, infra_y, 100, 35, colors.HexColor('#c62828'), 'Redis', font_size=9, rx=6)
    draw_rounded_rect(d, 250, infra_y, 100, 35, colors.HexColor('#e65100'), 'Kafka', font_size=9, rx=6)
    draw_rounded_rect(d, 370, infra_y, 120, 35, colors.HexColor('#4e342e'), 'Event Store', font_size=9, rx=6)

    # Infra label
    d.add(String(250, 70, 'Infrastructure Layer', textAnchor='middle',
                 fontSize=10, fillColor=colors.HexColor('#757575'), fontName='Helvetica-Oblique'))

    return d


def create_event_sourcing_diagram():
    """Create Event Sourcing / CQRS flow diagram."""
    d = Drawing(500, 280)
    d.add(Rect(0, 0, 500, 280, fillColor=colors.HexColor('#fafafa'), strokeColor=None))

    d.add(String(250, 260, 'Event Sourcing & CQRS Pattern', textAnchor='middle',
                 fontSize=14, fillColor=DARK, fontName='Helvetica-Bold'))

    # Command side
    d.add(String(130, 230, 'Write Side (Command)', textAnchor='middle',
                 fontSize=11, fillColor=PRIMARY, fontName='Helvetica-Bold'))

    draw_rounded_rect(d, 30, 190, 90, 30, PRIMARY, 'Command', font_size=9)
    draw_arrow(d, 120, 205, 145, 205, PRIMARY)
    draw_rounded_rect(d, 145, 190, 100, 30, colors.HexColor('#1565c0'), 'Aggregate', font_size=9)
    draw_arrow(d, 245, 205, 270, 205, PRIMARY)
    draw_rounded_rect(d, 270, 190, 95, 30, ACCENT, 'Event Store', font_size=9)

    # Events flow down
    draw_arrow(d, 317, 190, 317, 155, ACCENT)

    # Event
    draw_rounded_rect(d, 270, 120, 95, 30, ORANGE, 'Domain Event', font_size=9)

    # Branch: to outbox and to projector
    draw_arrow(d, 270, 135, 170, 90, ORANGE)
    draw_arrow(d, 365, 135, 430, 90, ORANGE)

    # Query side
    d.add(String(130, 95, 'Read Side (Query)', textAnchor='middle',
                 fontSize=11, fillColor=SECONDARY, fontName='Helvetica-Bold'))

    draw_rounded_rect(d, 100, 55, 100, 30, SECONDARY, 'Projector', font_size=9)
    draw_arrow(d, 150, 55, 150, 25, SECONDARY)
    draw_rounded_rect(d, 85, -5, 130, 25, colors.HexColor('#2e7d32'), 'Read Model (PG)', font_size=9)

    # Kafka outbox
    draw_rounded_rect(d, 380, 55, 100, 30, colors.HexColor('#e65100'), 'Kafka Outbox', font_size=9)
    draw_arrow(d, 430, 55, 430, 25, colors.HexColor('#e65100'))
    draw_rounded_rect(d, 370, -5, 120, 25, colors.HexColor('#bf360c'), 'Other Services', font_size=9)

    return d


def create_order_flow_diagram():
    """Create order placement flow diagram."""
    d = Drawing(500, 320)
    d.add(Rect(0, 0, 500, 320, fillColor=colors.HexColor('#fafafa'), strokeColor=None))

    d.add(String(250, 300, 'Order Placement Flow', textAnchor='middle',
                 fontSize=14, fillColor=DARK, fontName='Helvetica-Bold'))

    steps = [
        (50, 250, 'Client\nPlace Order', PRIMARY),
        (50, 195, 'Gateway\nJWT Validate', colors.HexColor('#455a64')),
        (50, 140, 'Order Engine\nCreate Aggregate', ACCENT),
        (200, 140, 'Market Data\nGet Price', SECONDARY),
        (350, 140, 'Portfolio\nReserve Funds', ORANGE),
        (200, 75, 'Matching\nEngine', colors.HexColor('#6a1b9a')),
        (350, 75, 'Event Store\nPersist Events', colors.HexColor('#c62828')),
        (200, 15, 'Portfolio\nSettle Trade', ORANGE),
    ]

    for x, y, label, col in steps:
        lines = label.split('\n')
        draw_rounded_rect(d, x, y, 130, 40, col, lines[0], font_size=9, rx=6)
        if len(lines) > 1:
            d.add(String(x + 65, y + 6, lines[1], textAnchor='middle',
                         fontSize=8, fillColor=colors.HexColor('#ffffffcc'), fontName='Helvetica'))

    # Arrows (sequential flow)
    draw_arrow(d, 115, 250, 115, 237, DARK)
    draw_arrow(d, 115, 195, 115, 182, DARK)
    draw_arrow(d, 180, 160, 200, 160, DARK)
    draw_arrow(d, 330, 160, 350, 160, DARK)
    draw_arrow(d, 115, 140, 115, 120, DARK)

    draw_arrow(d, 115, 120, 200, 95, DARK)
    draw_arrow(d, 330, 95, 350, 95, DARK)
    draw_arrow(d, 265, 75, 265, 57, DARK)

    # Step numbers
    for i, (x, y, _, _) in enumerate(steps):
        d.add(Circle(x + 8, y + 32, 8, fillColor=colors.white, strokeColor=DARK, strokeWidth=1))
        d.add(String(x + 8, y + 28, str(i + 1), textAnchor='middle',
                     fontSize=8, fillColor=DARK, fontName='Helvetica-Bold'))

    return d


def create_tech_stack_chart():
    """Create tech stack bar chart showing component counts."""
    d = Drawing(460, 220)

    bc = VerticalBarChart()
    bc.x = 60
    bc.y = 40
    bc.height = 150
    bc.width = 370
    bc.data = [[8, 6, 4, 3, 2, 1]]
    bc.categoryAxis.categoryNames = [
        'Microservices', 'Databases', 'Shared Pkgs',
        'Infra Tools', 'Patterns', 'Gateway'
    ]
    bc.categoryAxis.labels.fontSize = 9
    bc.categoryAxis.labels.fontName = 'Helvetica'
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = 10
    bc.valueAxis.valueStep = 2
    bc.valueAxis.labels.fontSize = 9
    bc.bars[0].fillColor = PRIMARY
    bc.bars[0].strokeColor = None
    bc.barWidth = 30
    bc.groupSpacing = 15

    d.add(bc)
    d.add(String(250, 205, 'Project Component Distribution',
                 textAnchor='middle', fontSize=12, fillColor=DARK, fontName='Helvetica-Bold'))
    return d


def create_service_responsibility_pie():
    """Create pie chart for service responsibility distribution."""
    d = Drawing(400, 230)

    pc = Pie()
    pc.x = 100
    pc.y = 30
    pc.width = 160
    pc.height = 160
    pc.data = [25, 25, 20, 15, 5, 5, 5]
    pc.labels = ['Order Engine', 'Portfolio', 'Market Data', 'User/Auth',
                 'Notification', 'Chat', 'AI']
    pc.slices[0].fillColor = ACCENT
    pc.slices[1].fillColor = ORANGE
    pc.slices[2].fillColor = SECONDARY
    pc.slices[3].fillColor = PRIMARY
    pc.slices[4].fillColor = PURPLE
    pc.slices[5].fillColor = TEAL
    pc.slices[6].fillColor = PINK
    pc.sideLabels = True
    pc.slices.fontSize = 9
    pc.slices.fontName = 'Helvetica'

    d.add(pc)
    d.add(String(200, 210, 'Service Complexity Distribution',
                 textAnchor='middle', fontSize=12, fillColor=DARK, fontName='Helvetica-Bold'))
    return d


def create_price_simulation_chart():
    """Create a sample GBM price simulation chart."""
    import random
    random.seed(42)

    d = Drawing(460, 230)

    lp = LinePlot()
    lp.x = 50
    lp.y = 30
    lp.height = 165
    lp.width = 380

    # Simulate GBM prices for BTC and ETH
    btc_prices = [96000]
    eth_prices = [3400]
    for _ in range(49):
        btc_prices.append(btc_prices[-1] * (1 + random.gauss(0.0002, 0.008)))
        eth_prices.append(eth_prices[-1] * (1 + random.gauss(0.0001, 0.012)))

    lp.data = [
        [(i, p / 1000) for i, p in enumerate(btc_prices)],  # Scale down for chart
        [(i, p / 100) for i, p in enumerate(eth_prices)],
    ]

    lp.lines[0].strokeColor = ORANGE
    lp.lines[0].strokeWidth = 2
    lp.lines[1].strokeColor = PRIMARY
    lp.lines[1].strokeWidth = 2

    lp.xValueAxis.valueMin = 0
    lp.xValueAxis.valueMax = 50
    lp.xValueAxis.labels.fontSize = 8
    lp.yValueAxis.labels.fontSize = 8

    d.add(lp)
    d.add(String(240, 210, 'GBM Price Simulation (BTC / ETH)',
                 textAnchor='middle', fontSize=12, fillColor=DARK, fontName='Helvetica-Bold'))

    # Legend
    d.add(Rect(60, 200, 10, 10, fillColor=ORANGE, strokeColor=None))
    d.add(String(75, 201, 'BTC (x1000)', fontSize=9, fillColor=DARK, fontName='Helvetica'))
    d.add(Rect(170, 200, 10, 10, fillColor=PRIMARY, strokeColor=None))
    d.add(String(185, 201, 'ETH (x100)', fontSize=9, fillColor=DARK, fontName='Helvetica'))

    return d


def create_db_schema_diagram():
    """Create database schema overview diagram."""
    d = Drawing(500, 300)
    d.add(Rect(0, 0, 500, 300, fillColor=colors.HexColor('#fafafa'), strokeColor=None))

    d.add(String(250, 280, 'Database-per-Service Schema', textAnchor='middle',
                 fontSize=14, fillColor=DARK, fontName='Helvetica-Bold'))

    dbs = [
        (10, 180, 'mex_auth', ['users', 'refresh_tokens'], PRIMARY),
        (130, 180, 'mex_market', ['assets', 'price_history', 'candlesticks'], SECONDARY),
        (260, 180, 'mex_orders', ['event_store', 'orders_read', 'trades_read'], ACCENT),
        (390, 180, 'mex_portfolio', ['accounts', 'holdings', 'transactions'], ORANGE),
    ]

    for x, y, db_name, tables, col in dbs:
        # DB box
        d.add(Rect(x, y, 110, 90, fillColor=colors.white, strokeColor=col, strokeWidth=2, rx=4, ry=4))
        d.add(Rect(x, y + 70, 110, 20, fillColor=col, strokeColor=None, rx=4, ry=4))
        d.add(Rect(x, y + 70, 110, 10, fillColor=col, strokeColor=None))
        d.add(String(x + 55, y + 74, db_name, textAnchor='middle',
                     fontSize=9, fillColor=colors.white, fontName='Helvetica-Bold'))

        for i, tbl in enumerate(tables):
            d.add(String(x + 10, y + 50 - i * 16, '- ' + tbl,
                         fontSize=8, fillColor=DARK, fontName='Courier'))

    # Event Store shared
    draw_rounded_rect(d, 150, 70, 200, 35, colors.HexColor('#37474f'),
                      'Shared Event Store (PostgreSQL)', font_size=9, rx=6)

    # Infrastructure
    draw_rounded_rect(d, 30, 15, 130, 30, colors.HexColor('#c62828'), 'Redis Cache', font_size=9, rx=6)
    draw_rounded_rect(d, 200, 15, 130, 30, colors.HexColor('#e65100'), 'Apache Kafka', font_size=9, rx=6)
    draw_rounded_rect(d, 370, 15, 110, 30, colors.HexColor('#1b5e20'), 'Prometheus', font_size=9, rx=6)

    return d


def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), 'VirtuEx_Specification.pdf')
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    styles = get_styles()
    story = []

    # ═══════════════════ COVER PAGE ═══════════════════
    story.append(Spacer(1, 80))
    story.append(Paragraph('VirtuEx', styles['CoverTitle']))
    story.append(Spacer(1, 10))
    story.append(Paragraph('Real-Time Trading Platform', styles['CoverSub']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Project Specification Document', styles['CoverSub']))
    story.append(Spacer(1, 40))

    # Cover info table
    cover_data = [
        ['Project', 'VirtuEx - Real-Time Trading Platform'],
        ['Version', '0.1.0 (Phase 1 Complete)'],
        ['Architecture', 'Microservices, Event Sourcing, CQRS'],
        ['Tech Stack', 'NestJS / PostgreSQL / Redis / Kafka'],
        ['Date', '2026-02-17'],
    ]
    cover_table = Table(cover_data, colWidths=[120, 300])
    cover_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), PRIMARY),
        ('TEXTCOLOR', (1, 0), (1, -1), DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, LIGHT_BORDER),
    ]))
    story.append(cover_table)
    story.append(PageBreak())

    # ═══════════════════ TABLE OF CONTENTS ═══════════════════
    story.append(Paragraph('Table of Contents', styles['SectionTitle']))
    toc_items = [
        '1. Project Overview',
        '2. System Architecture',
        '3. Service Details',
        '4. Event Sourcing & CQRS',
        '5. Order Placement Flow',
        '6. Database Schema',
        '7. API Specification',
        '8. Technology Distribution',
        '9. Price Simulation Engine',
        '10. Development Roadmap',
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles['BodyText2']))
    story.append(PageBreak())

    # ═══════════════════ 1. PROJECT OVERVIEW ═══════════════════
    story.append(Paragraph('1. Project Overview', styles['SectionTitle']))
    story.append(Paragraph(
        'VirtuEx is a production-grade, real-time mock stock and crypto trading platform '
        'designed as a comprehensive microservices architecture showcase. The system simulates '
        'realistic market conditions using Geometric Brownian Motion (GBM) for price generation, '
        'supports market and limit orders through an event-sourced order engine, and manages user '
        'portfolios with precise decimal arithmetic for financial calculations.',
        styles['BodyText2']
    ))
    story.append(Paragraph(
        'The platform is built to handle 1,000+ concurrent traders with horizontal scalability, '
        'featuring real-time price streaming via WebSocket, asynchronous event processing through '
        'Kafka, and a CQRS pattern that separates write and read models for optimal performance.',
        styles['BodyText2']
    ))

    story.append(Paragraph('Key Features', styles['SubSection']))
    features = [
        ['Feature', 'Description', 'Status'],
        ['User Authentication', 'JWT + Refresh Token rotation', 'Complete'],
        ['Market Data', 'GBM price simulation, 10 assets', 'Complete'],
        ['Order Engine', 'Event-sourced, market/limit orders', 'Complete'],
        ['Portfolio Mgmt', 'Balance, holdings, settlement', 'Complete'],
        ['API Gateway', 'JWT validation, rate limiting, proxy', 'Complete'],
        ['Real-time Prices', 'WebSocket streaming via Socket.IO', 'Planned'],
        ['Chat System', 'Real-time messaging between traders', 'Planned'],
        ['AI Analysis', 'Trading signals and portfolio insights', 'Planned'],
    ]
    feat_table = Table(features, colWidths=[120, 240, 70])
    feat_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(feat_table)
    story.append(PageBreak())

    # ═══════════════════ 2. SYSTEM ARCHITECTURE ═══════════════════
    story.append(Paragraph('2. System Architecture', styles['SectionTitle']))
    story.append(Paragraph(
        'The system follows a microservices architecture with API Gateway pattern. Each service '
        'is independently deployable, owns its database (Database-per-Service), and communicates '
        'through HTTP for synchronous calls and Kafka for asynchronous event processing.',
        styles['BodyText2']
    ))
    story.append(create_architecture_diagram())
    story.append(Spacer(1, 10))

    story.append(Paragraph('Architecture Principles', styles['SubSection']))
    principles = [
        'Single Responsibility: Each service handles one bounded context',
        'Database-per-Service: Independent PostgreSQL databases prevent coupling',
        'Event-Driven: Kafka enables async communication and eventual consistency',
        'API Gateway: Centralized authentication, rate limiting, and routing',
        'CQRS: Separate write (Event Store) and read (PostgreSQL) models',
        'Idempotency: All write operations support idempotency keys',
    ]
    for p in principles:
        story.append(Paragraph(f'&#8226; {p}', styles['BodyText2']))
    story.append(PageBreak())

    # ═══════════════════ 3. SERVICE DETAILS ═══════════════════
    story.append(Paragraph('3. Service Details', styles['SectionTitle']))

    services_info = [
        ('API Gateway (:3000)', 'Entry point for all client requests. Validates JWT tokens, '
         'applies rate limiting (100 req/min), and proxies requests to downstream services. '
         'Includes WebSocket gateway for real-time price streaming.',
         ['JWT Authentication', 'Rate Limiting (Throttler)', 'HTTP Proxy', 'WebSocket Gateway']),

        ('User/Auth Service (:3007)', 'Handles user registration, authentication, and token '
         'management. Uses bcrypt for password hashing and SHA-256 for refresh token hashing. '
         'Implements token rotation for security.',
         ['Register/Login', 'JWT Access Token (15m)', 'Refresh Token Rotation (7d)', 'httpOnly Cookie']),

        ('Market Data Service (:3001)', 'Simulates realistic price movements using Geometric '
         'Brownian Motion. Supports 10 assets (BTC, ETH, SOL, XRP, DOGE, AAPL, GOOGL, TSLA, '
         'MSFT, NVDA) with configurable volatility and drift.',
         ['GBM Price Engine', 'Redis Price Cache', 'Kafka Event Publishing', 'Candlestick Aggregation']),

        ('Order Engine (:3002)', 'Event-sourced order management with CQRS pattern. Supports '
         'market and limit orders with an in-memory matching engine using price-time priority.',
         ['Event Sourcing (AggregateRoot)', 'In-Memory Order Book', 'CQRS Read Model Projection',
          'Idempotency Check']),

        ('Portfolio Service (:3003)', 'Manages user balances, holdings, and trade settlement. '
         'Uses Decimal.js for precise financial calculations and weighted average cost basis tracking.',
         ['Deposit/Balance Management', 'Fund Reservation (Order Flow)', 'Buy/Sell Settlement',
          'Weighted Avg Cost Basis']),
    ]

    for name, desc, features in services_info:
        story.append(Paragraph(name, styles['SubSection']))
        story.append(Paragraph(desc, styles['BodyText2']))
        feat_str = ' &bull; '.join(features)
        story.append(Paragraph(f'<i>Components: {feat_str}</i>', styles['SmallNote']))
        story.append(Spacer(1, 6))

    story.append(PageBreak())

    # ═══════════════════ 4. EVENT SOURCING & CQRS ═══════════════════
    story.append(Paragraph('4. Event Sourcing & CQRS', styles['SectionTitle']))
    story.append(Paragraph(
        'The Order Engine uses Event Sourcing to persist all state changes as immutable events. '
        'Instead of storing the current state, the system records every event that occurs '
        '(OrderPlaced, OrderMatched, OrderFilled, OrderCancelled). The current state is '
        'reconstructed by replaying events from the Event Store.',
        styles['BodyText2']
    ))
    story.append(create_event_sourcing_diagram())
    story.append(Spacer(1, 10))

    story.append(Paragraph('Event Types', styles['SubSection']))
    event_data = [
        ['Event Type', 'Trigger', 'Data'],
        ['OrderPlaced', 'User submits order', 'orderId, symbol, side, type, quantity, price'],
        ['OrderMatched', 'Matching engine finds match', 'tradeId, matchedQty, matchedPrice'],
        ['OrderFilled', 'Order fully executed', 'totalFilledQty, averagePrice'],
        ['OrderCancelled', 'User or system cancels', 'reason, unfilledQuantity'],
    ]
    event_table = Table(event_data, colWidths=[110, 150, 180])
    event_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(event_table)
    story.append(PageBreak())

    # ═══════════════════ 5. ORDER FLOW ═══════════════════
    story.append(Paragraph('5. Order Placement Flow', styles['SectionTitle']))
    story.append(Paragraph(
        'When a user places an order, the system orchestrates multiple services in a saga-like '
        'pattern: validating the request, checking market prices, reserving funds, executing the '
        'matching engine, persisting events, and settling trades.',
        styles['BodyText2']
    ))
    story.append(create_order_flow_diagram())
    story.append(Spacer(1, 10))

    flow_steps = [
        '1. Client sends POST /api/orders with JWT token',
        '2. API Gateway validates JWT, extracts userId, proxies to Order Engine',
        '3. Order Engine checks idempotency key against read model',
        '4. Fetches current market price from Market Data Service',
        '5. Reserves funds in Portfolio Service (for BUY orders)',
        '6. Creates OrderAggregate, raises ORDER_PLACED event',
        '7. Persists event to Event Store with Outbox entry',
        '8. For MARKET orders: Matching Engine executes immediately',
        '9. Raises ORDER_MATCHED / ORDER_FILLED events',
        '10. Settles trade in Portfolio Service (buy/sell settlement)',
    ]
    for step in flow_steps:
        story.append(Paragraph(step, styles['BodyText2']))
    story.append(PageBreak())

    # ═══════════════════ 6. DATABASE SCHEMA ═══════════════════
    story.append(Paragraph('6. Database Schema', styles['SectionTitle']))
    story.append(Paragraph(
        'Each service owns its database following the Database-per-Service pattern. '
        'All monetary values use Decimal(20,8) for precision. The Event Store uses a shared '
        'PostgreSQL database with optimistic concurrency control.',
        styles['BodyText2']
    ))
    story.append(create_db_schema_diagram())
    story.append(Spacer(1, 10))

    # Schema table
    schema_data = [
        ['Database', 'Tables', 'Purpose'],
        ['mex_auth', 'users, refresh_tokens', 'User accounts and auth tokens'],
        ['mex_market', 'assets, price_history, candlesticks', 'Market data and price feeds'],
        ['mex_orders', 'event_store, orders_read, trades_read', 'Order events and CQRS projections'],
        ['mex_portfolio', 'accounts, holdings, transactions', 'Balance and position tracking'],
    ]
    schema_table = Table(schema_data, colWidths=[90, 190, 165])
    schema_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#37474f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(schema_table)
    story.append(PageBreak())

    # ═══════════════════ 7. API SPECIFICATION ═══════════════════
    story.append(Paragraph('7. API Specification', styles['SectionTitle']))

    api_groups = [
        ('Authentication API', '/api/auth', [
            ['POST', '/register', 'No', 'Register new user'],
            ['POST', '/login', 'No', 'Login, returns JWT + refresh cookie'],
            ['POST', '/refresh', 'Cookie', 'Refresh access token'],
            ['POST', '/logout', 'Cookie', 'Revoke tokens'],
            ['GET', '/me', 'JWT', 'Get current user profile'],
        ]),
        ('Market Data API', '/api/market', [
            ['GET', '/assets', 'No', 'List all tradable assets'],
            ['GET', '/prices', 'No', 'Latest prices for all assets'],
            ['GET', '/prices/:symbol', 'No', 'Price for specific symbol'],
            ['GET', '/prices/:symbol/history', 'No', 'Historical price data'],
            ['GET', '/prices/:symbol/candlesticks', 'No', 'OHLCV candlestick data'],
        ]),
        ('Order API', '/api/orders', [
            ['POST', '/', 'JWT', 'Place new order (market/limit)'],
            ['GET', '/', 'JWT', 'List user orders (paginated)'],
            ['GET', '/:orderId', 'JWT', 'Get order detail'],
            ['DELETE', '/:orderId', 'JWT', 'Cancel pending order'],
            ['GET', '/trades/history', 'JWT', 'User trade history'],
            ['GET', '/book/:symbol', 'No', 'Order book depth'],
        ]),
        ('Portfolio API', '/api/portfolio', [
            ['POST', '/deposit', 'JWT', 'Deposit funds'],
            ['GET', '/balance', 'JWT', 'Cash balance'],
            ['GET', '/holdings', 'JWT', 'Asset holdings'],
            ['GET', '/summary', 'JWT', 'Full portfolio summary'],
            ['GET', '/transactions', 'JWT', 'Transaction history'],
        ]),
    ]

    for group_name, base_path, endpoints in api_groups:
        story.append(Paragraph(f'{group_name} ({base_path})', styles['SubSection']))
        data = [['Method', 'Path', 'Auth', 'Description']] + endpoints
        t = Table(data, colWidths=[50, 140, 50, 200])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 1), (0, -1), 'Courier-Bold'),
            ('TEXTCOLOR', (0, 1), (0, -1), PRIMARY),
        ]))
        story.append(t)
        story.append(Spacer(1, 10))

    story.append(PageBreak())

    # ═══════════════════ 8. TECHNOLOGY DISTRIBUTION ═══════════════════
    story.append(Paragraph('8. Technology Distribution', styles['SectionTitle']))
    story.append(Paragraph(
        'The project is organized into 10 buildable packages: 2 shared libraries and 8 microservices. '
        'The chart below shows the distribution of components across different categories.',
        styles['BodyText2']
    ))
    story.append(create_tech_stack_chart())
    story.append(Spacer(1, 15))
    story.append(create_service_responsibility_pie())
    story.append(PageBreak())

    # ═══════════════════ 9. PRICE SIMULATION ═══════════════════
    story.append(Paragraph('9. Price Simulation Engine', styles['SectionTitle']))
    story.append(Paragraph(
        'The Market Data Service uses Geometric Brownian Motion (GBM) to simulate realistic '
        'price movements. The model follows the stochastic differential equation:',
        styles['BodyText2']
    ))
    story.append(Paragraph(
        'dS = mu * S * dt + sigma * S * dW',
        styles['CodeBlock']
    ))
    story.append(Paragraph(
        'Where S is the asset price, mu is the drift (expected return), sigma is the volatility, '
        'dt is the time step, and dW is a Wiener process (random walk). Each asset has configurable '
        'base price, drift, and volatility parameters.',
        styles['BodyText2']
    ))
    story.append(create_price_simulation_chart())
    story.append(Spacer(1, 10))

    # Asset config table
    asset_data = [
        ['Symbol', 'Type', 'Base Price', 'Volatility', 'Drift'],
        ['BTC', 'Crypto', '$96,000', '2.5%', '0.02%'],
        ['ETH', 'Crypto', '$3,400', '3.0%', '0.01%'],
        ['SOL', 'Crypto', '$190', '4.0%', '0.03%'],
        ['AAPL', 'Stock', '$185', '1.2%', '0.005%'],
        ['TSLA', 'Stock', '$380', '3.5%', '0.01%'],
        ['NVDA', 'Stock', '$900', '3.0%', '0.02%'],
    ]
    asset_table = Table(asset_data, colWidths=[60, 60, 90, 80, 80])
    asset_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
    ]))
    story.append(asset_table)
    story.append(PageBreak())

    # ═══════════════════ 10. DEVELOPMENT ROADMAP ═══════════════════
    story.append(Paragraph('10. Development Roadmap', styles['SectionTitle']))

    roadmap = [
        ('Phase 0: Foundation', 'Complete', [
            'Monorepo setup (Turborepo + pnpm)',
            'Docker Compose (PostgreSQL, Redis, Kafka)',
            'Shared packages (common, event-store)',
            'User/Auth Service with JWT',
            'API Gateway with rate limiting',
            'CI/CD Pipeline (GitHub Actions)',
        ]),
        ('Phase 1: Core Trading MVP', 'Complete', [
            'Market Data Service with GBM price engine',
            'Order Engine with Event Sourcing + CQRS',
            'Portfolio Service with balance management',
            'API Gateway proxy wiring for all services',
            'Trade settlement flow',
        ]),
        ('Phase 2: Advanced Trading', 'Planned', [
            'Enhanced limit order matching',
            'Candlestick charts and technical indicators',
            'P&L calculation and portfolio analytics',
            'WebSocket real-time price streaming',
        ]),
        ('Phase 3: Social Features', 'Planned', [
            'Real-time chat between traders',
            'Push notifications (email, WebSocket)',
            'Activity feed and social features',
        ]),
        ('Phase 4: AI Integration', 'Planned', [
            'Trading signal generation',
            'Portfolio analysis and recommendations',
            'Market sentiment analysis',
        ]),
        ('Phase 5: Production', 'Planned', [
            'Kubernetes deployment manifests',
            'Helm charts and service mesh',
            'Observability (Prometheus, Grafana, Jaeger)',
            'Load testing and performance optimization',
        ]),
    ]

    for phase_name, status, items in roadmap:
        color = SECONDARY if status == 'Complete' else colors.HexColor('#9e9e9e')
        status_icon = '[DONE]' if status == 'Complete' else '[TODO]'
        story.append(Paragraph(
            f'<font color="#{color.hexval()[2:]}">{status_icon}</font> {phase_name}',
            styles['SubSection']
        ))
        for item in items:
            story.append(Paragraph(f'    &#8226; {item}', styles['BodyText2']))
        story.append(Spacer(1, 6))

    # Build
    doc.build(story)
    print(f'PDF generated: {output_path}')
    return output_path


if __name__ == '__main__':
    build_pdf()
