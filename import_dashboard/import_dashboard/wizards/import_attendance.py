from odoo import fields, models, _
from odoo.exceptions import ValidationError
import base64
import binascii
import csv
import io
import tempfile
import xlrd
from datetime import datetime

class ImportAttendance(models.TransientModel):
    _name = 'import.attendance'
    _description = 'Attendance Import'

    file_type = fields.Selection(
        selection=[('csv', 'CSV File'), ('xls', 'XLS File')],
        string='Select File Type', default='csv',
        help="It helps to select File Type")
    file_upload = fields.Binary(string="Upload File", help="It helps to upload files")

    def action_import_attendance(self):
        hr_employee = self.env['hr.employee']
        hr_attendance = self.env['hr.attendance']
        datas = {}

        if self.file_type == 'csv':
            try:
                csv_data = base64.b64decode(self.file_upload)
                data_file = io.StringIO(csv_data.decode("utf-8"))
                data_file.seek(0)
                datas = csv.DictReader(data_file, delimiter=',')
            except Exception as e:
                raise ValidationError(_("Invalid CSV file format. Error: %s" % str(e)))

        if self.file_type == 'xls':
            try:
                fp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
                fp.write(binascii.a2b_base64(self.file_upload))
                fp.seek(0)
                workbook = xlrd.open_workbook(fp.name)
                sheet = workbook.sheet_by_index(0)
            except Exception as e:
                raise ValidationError(_("Invalid XLS file format. Error: %s" % str(e)))

            headers = sheet.row_values(0)
            data = []
            for row_index in range(1, sheet.nrows):
                row = sheet.row_values(row_index)
                data += [{k: v for k, v in zip(headers, row)}]
            datas = data

        for item in datas:
            vals = {}
            employee_name = item.get('Employee')

            # Búsqueda flexible de empleados
            employee = hr_employee.search([
                '|', 
                ('name', 'ilike', employee_name),
                ('identification_id', '=', employee_name)
            ], limit=1)

            if not employee:
                raise ValidationError(_("No employee found with the name or identification: %s" % employee_name))

            vals['employee_id'] = employee.id

            # Verificar si ya hay una asistencia abierta (sin check_out)
            existing_attendance = hr_attendance.search([
                ('employee_id', '=', employee.id),
                ('check_out', '=', False)
            ], limit=1)

            if existing_attendance:
                # Si ya hay una asistencia abierta, cerrarla antes de continuar
                existing_attendance.write({
                    'check_out': datetime.now(),  # Cerramos la asistencia con la hora actual
                })

            # Validación y conversión de fechas de entrada
            if item.get('Check In'):
                check_in_str = item.get('Check In')
                try:
                    # Intentar múltiples formatos de fecha
                    date_formats = [
                        '%Y-%m-%d %H:%M:%S',  # Formato estándar
                        '%d/%m/%Y %H:%M:%S',  # Formato día/mes/año
                        '%m/%d/%Y %H:%M:%S',  # Formato mes/día/año
                        '%Y-%m-%d %H:%M',     # Sin segundos
                        '%d/%m/%Y %H:%M',     # Sin segundos
                    ]
                    
                    for date_format in date_formats:
                        try:
                            vals['check_in'] = datetime.strptime(check_in_str, date_format)
                            break
                        except ValueError:
                            continue
                    else:
                        raise ValueError("No se pudo parsear la fecha de entrada")
                
                except ValueError:
                    raise ValidationError(_("Invalid date format for 'Check In'. Supported formats: YYYY-MM-DD HH:MM:SS, DD/MM/YYYY HH:MM:SS"))

            # Validación y conversión de fechas de salida
            if item.get('Check Out'):
                check_out_str = item.get('Check Out')
                try:
                    # Intentar múltiples formatos de fecha
                    date_formats = [
                        '%Y-%m-%d %H:%M:%S',  # Formato estándar
                        '%d/%m/%Y %H:%M:%S',  # Formato día/mes/año
                        '%m/%d/%Y %H:%M:%S',  # Formato mes/día/año
                        '%Y-%m-%d %H:%M',     # Sin segundos
                        '%d/%m/%Y %H:%M',     # Sin segundos
                    ]
                    
                    for date_format in date_formats:
                        try:
                            vals['check_out'] = datetime.strptime(check_out_str, date_format)
                            break
                        except ValueError:
                            continue
                    else:
                        raise ValueError("No se pudo parsear la fecha de salida")
                
                except ValueError:
                    raise ValidationError(_("Invalid date format for 'Check Out'. Supported formats: YYYY-MM-DD HH:MM:SS, DD/MM/YYYY HH:MM:SS"))

            # Validación de horas trabajadas
            if item.get('Worked Hours'):
                try:
                    vals['worked_hours'] = float(item.get('Worked Hours'))
                except ValueError:
                    raise ValidationError(_("Worked Hours must be a valid number"))

            # Crear registro de asistencia
            hr_attendance.create(vals)

        return {
            'effect': {
                'fadeout': 'slow',
                'message': _('Imported Successfully'),
                'type': 'rainbow_man',
            }
        }

    def action_test_attendance(self):
        """Test the file before import"""
        if not self.file_upload:
            raise ValidationError(_("Please upload a valid file before continuing."))

        # Validate file type
        if self.file_type == 'csv':
            try:
                csv_data = base64.b64decode(self.file_upload)
                data_file = io.StringIO(csv_data.decode("utf-8"))
                data_file.seek(0)
                csv_reader = csv.DictReader(data_file, delimiter=',')
                rows = list(csv_reader)
                if not rows:
                    raise ValidationError(_("The CSV file is empty."))
            except Exception as e:
                raise ValidationError(_("Error reading the CSV file: %s" % str(e)))
        
        elif self.file_type == 'xls':
            try:
                fp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
                fp.write(binascii.a2b_base64(self.file_upload))
                fp.seek(0)
                workbook = xlrd.open_workbook(fp.name)
                sheet = workbook.sheet_by_index(0)
                if sheet.nrows <= 1:  # If there's no data except header
                    raise ValidationError(_("The XLSX file is empty."))
            except Exception as e:
                raise ValidationError(_("Error reading the XLSX file: %s" % str(e)))
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Validation Success'),
                'message': _('File validated successfully.'),
                'sticky': False,
            }
        }

    def action_generate_template(self):
        """Generates an Excel template for importing employee attendances"""

        import base64
        from io import BytesIO
        import xlsxwriter

        # Headers the file should contain
        field_labels = [
            "Empleado",       # Nombre del empleado
            "Entrada",        # Fecha/hora de entrada
            "Salida",         # Fecha/hora de salida
            "Horas Trabajadas"    # Horas trabajadas
        ]

        # Create an Excel file in memory
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet("Attendance Template")

        # Header format
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9D9D9'})

        # Write headers in the first row
        for col, label in enumerate(field_labels):
            worksheet.write(0, col, label, header_format)

        # Add an example row of data (the second row)
        example_data = [
            "ANDERSON JAIR CHASILOA NACATA",  # Empleado
            "2024-03-19 08:00:00",    # Entrada
            "2024-03-19 17:00:00",    # Salida
            8                          # Horas trabajadas
        ]

        # Write the example data in the second row (row 1, since 0 is for headers)
        for col, value in enumerate(example_data):
            worksheet.write(1, col, value)

        # Adjust column width to fit the content (auto-adjust)
        for col in range(len(field_labels)):
            column_width = max(len(field_labels[col]), max(len(str(example_data[col])) for example_data in [example_data]))
            worksheet.set_column(col, col, column_width)

        # Close and prepare the file
        workbook.close()
        output.seek(0)

        # Create an attachment in Odoo
        attachment = self.env['ir.attachment'].create({
            'name': 'attendance_import_template.xlsx',
            'type': 'binary',
            'datas': base64.b64encode(output.read()).decode(),
            'mimetype': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        # Return the download URL
        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }