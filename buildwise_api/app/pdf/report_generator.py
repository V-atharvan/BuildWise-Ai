import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportGenerator:
    @staticmethod
    def generate_pdf_report(
        filename_path: str,
        project_name: str,
        building_type: str,
        materials: dict,
        costs: dict
    ) -> None:
        doc = SimpleDocTemplate(
            filename_path,
            pagesize=letter,
            rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Premium palette matching Violet/Lavender design tokens
        primary_color = colors.HexColor("#7C3AED")
        secondary_color = colors.HexColor("#A78BFA")
        text_color = colors.HexColor("#111827")
        light_bg = colors.HexColor("#F5F3FF")

        # Custom paragraph styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=primary_color,
            fontName='Helvetica-Bold',
            spaceAfter=12
        )
        
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=primary_color,
            fontName='Helvetica-Bold',
            spaceBefore=14,
            spaceAfter=8
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['BodyText'],
            fontSize=10,
            leading=14,
            textColor=text_color
        )
        
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )

        story = []

        # 1. Header Title
        story.append(Paragraph("BuildWise AI", title_style))
        story.append(Paragraph("Material Estimation & Bill of Quantities (BOQ) Report", body_style))
        story.append(Spacer(1, 12))
        
        # 2. Project Metadata block
        meta_data = [
            [Paragraph("Project Name:", body_bold), Paragraph(project_name, body_style)],
            [Paragraph("Building Type:", body_bold), Paragraph(building_type, body_style)],
            [Paragraph("Date:", body_bold), Paragraph("11-07-2026", body_style)],
        ]
        meta_table = Table(meta_data, colWidths=[120, 420])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('PADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-1), 1, secondary_color),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 16))

        # 3. Materials summary table
        story.append(Paragraph("Material Quantities Breakdown", section_heading))
        mat_data = [
            [Paragraph("Material Item", body_bold), Paragraph("Quantity", body_bold), Paragraph("Unit", body_bold)],
            [Paragraph("Concrete Volume", body_style), Paragraph(str(materials.get("concrete_volume_m3", 0.0)), body_style), Paragraph("m³", body_style)],
            [Paragraph("Steel Reinforcement", body_style), Paragraph(str(materials.get("steel_weight_kg", 0.0)), body_style), Paragraph("kg", body_style)],
            [Paragraph("Bricks", body_style), Paragraph(str(materials.get("bricks_count", 0)), body_style), Paragraph("pieces", body_style)],
            [Paragraph("Cement", body_style), Paragraph(str(materials.get("cement_bags", 0)), body_style), Paragraph("Bags", body_style)],
            [Paragraph("Sand Volume", body_style), Paragraph(str(materials.get("sand_volume_m3", 0.0)), body_style), Paragraph("m³", body_style)],
            [Paragraph("Aggregate Volume", body_style), Paragraph(str(materials.get("aggregate_volume_m3", 0.0)), body_style), Paragraph("m³", body_style)],
            [Paragraph("Waterproofing", body_style), Paragraph(str(materials.get("waterproofing_area_sq_m", 0.0)), body_style), Paragraph("m²", body_style)],
        ]
        mat_table = Table(mat_data, colWidths=[200, 200, 140])
        mat_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('PADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ]))
        # Fix text colors for header row inside table styling block
        for i in range(3):
            mat_data[0][i].style.textColor = colors.white
        story.append(mat_table)
        story.append(Spacer(1, 16))

        # 4. Costs summary table
        story.append(Paragraph("Cost Breakdown & Estimates", section_heading))
        cost_data = [
            [Paragraph("Cost Category", body_bold), Paragraph("Amount (INR)", body_bold)],
            [Paragraph("Material Cost", body_style), Paragraph(f"Rs. {costs.get('material_cost', 0.0):,.2f}", body_style)],
            [Paragraph("Labour Cost", body_style), Paragraph(f"Rs. {costs.get('labour_cost', 0.0):,.2f}", body_style)],
            [Paragraph("Equipment Cost", body_style), Paragraph(f"Rs. {costs.get('equipment_cost', 0.0):,.2f}", body_style)],
            [Paragraph("Transportation Cost", body_style), Paragraph(f"Rs. {costs.get('transportation_cost', 0.0):,.2f}", body_style)],
            [Paragraph("GST / Taxes", body_style), Paragraph(f"Rs. {costs.get('taxes', 0.0):,.2f}", body_style)],
            [Paragraph("Contractor Margin", body_style), Paragraph(f"Rs. {costs.get('profit_margin', 0.0):,.2f}", body_style)],
            [Paragraph("Contingency Buffer", body_style), Paragraph(f"Rs. {costs.get('contingency', 0.0):,.2f}", body_style)],
            [Paragraph("Grand Total Budget", body_bold), Paragraph(f"Rs. {costs.get('grand_total', 0.0):,.2f}", body_bold)],
        ]
        cost_table = Table(cost_data, colWidths=[270, 270])
        cost_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BACKGROUND', (0,-1), (-1,-1), light_bg),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ]))
        for i in range(2):
            cost_data[0][i].style.textColor = colors.white
        story.append(cost_table)

        doc.build(story)
