import base64
import binascii
import csv
import io
import tempfile
import xlrd
from odoo import fields, models
from odoo.exceptions import ValidationError


class ImportBillOfMaterial(models.TransientModel):
    _name = 'import.bill.of.material'
    _description = 'Importación de Listas de Materiales'

    file_type = fields.Selection(
        [('csv', 'Archivo CSV'), ('xls', 'Archivo XLS')],
        default='csv',
        string='Seleccionar Tipo de Archivo',
        help="Tipo de archivo para cargar"
    )
    file_upload = fields.Binary(
        string='Subir Archivo',
        help="Ayuda a subir el archivo",
        attachment=False
    )
    import_product_by = fields.Selection(
        [('default_code', 'Referencia Interna'), ('barcode', 'Código de Barras')],
        default='default_code',
        string="Importar Productos Por",
        help="Ayuda a importar el producto"
    )
    bom_type = fields.Selection(
        [('manufacture_this_product', 'Fabricar este Producto'),
         ('kit', 'Kit'), ('both', 'Ambos')],
        string="Tipo de BOM",
        default='both',
        help="Ayuda a elegir el tipo de BOM"
    )
    bom_component = fields.Selection(
        [('add', 'Agregar Componentes'), ('do_not', 'No agregar Componentes')],
        default='add',
        string="Componente BOM",
        help="Ayuda a elegir el comportamiento de los componentes BOM"
    )

    def action_import_bom(self):
        datas = {}
        if not self.file_upload:
            raise ValidationError("Por favor, sube un archivo válido antes de continuar.")

        # Cargar archivo CSV
        if self.file_type == 'csv':
            try:
                csv_data = base64.b64decode(self.file_upload)
                data_file = io.StringIO(csv_data.decode("utf-8"))
                data_file.seek(0)
                datas = csv.DictReader(data_file, delimiter=',')
            except Exception:
                raise ValidationError("Archivo CSV no válido.")

        # Cargar archivo XLS
        elif self.file_type == 'xls':
            try:
                fp = tempfile.NamedTemporaryFile(delete=False, suffix=".xls")
                fp.write(binascii.a2b_base64(self.file_upload))
                fp.seek(0)
                workbook = xlrd.open_workbook(fp.name)
                sheet = workbook.sheet_by_index(0)
                headers = sheet.row_values(0)
                datas = [
                    {k: v for k, v in zip(headers, sheet.row_values(i))}
                    for i in range(1, sheet.nrows)
                ]
            except Exception:
                raise ValidationError("Archivo XLS no válido.")

        row = 0
        imported = 0
        updated = 0
        error_msg = ""
        warning_msg = ""

        for item in datas:
            row += 1
            vals = {}
            product_tmpl = False

            # Buscar producto principal
            if item.get('Product'):
                if self.import_product_by == 'default_code' and item.get('Product/Internal Reference'):
                    product_tmpl = self.env['product.template'].search([
                        ('default_code', '=', item.get('Product/Internal Reference'))], limit=1)
                elif self.import_product_by == 'barcode' and item.get('Product/Barcode'):
                    product_tmpl = self.env['product.template'].search([
                        ('barcode', '=', item.get('Product/Barcode'))], limit=1)
                else:
                    product_tmpl = self.env['product.template'].search([
                        ('name', '=', item.get('Product'))], limit=1)

                if not product_tmpl:
                    product_tmpl = self.env['product.template'].create({
                        'name': item.get('Product'),
                        'default_code': item.get('Product/Internal Reference'),
                        'barcode': item.get('Product/Barcode')
                    })
                    warning_msg += f"\n◼ Producto nuevo creado en la fila {row}"

                vals['product_tmpl_id'] = product_tmpl.id
            else:
                error_msg += f"\n⚠ Producto faltante en la fila {row}"

            # Otras propiedades
            vals['product_qty'] = item.get('Quantity') or 1.0
            vals['code'] = item.get('Reference') or ''

            # Tipo de BOM
            bom_type = self.bom_type
            if bom_type == 'both' and item.get('BoM Type'):
                bom_type = 'manufacture_this_product' if item['BoM Type'] == 'Manufacture this Product' else 'kit'
            vals['type'] = 'normal' if bom_type == 'manufacture_this_product' else 'phantom'

            # Componentes
            components = {}
            if self.bom_component == 'add' and item.get('BoM Lines/Component'):
                product_component = False
                if item.get('BoM Lines/Component/Internal Reference'):
                    product_component = self.env['product.product'].search([
                        ('default_code', '=', item.get('BoM Lines/Component/Internal Reference'))], limit=1)
                elif item.get('BoM Lines/Component/Barcode'):
                    product_component = self.env['product.product'].search([
                        ('barcode', '=', item.get('BoM Lines/Component/Barcode'))], limit=1)
                else:
                    product_component = self.env['product.product'].search([
                        ('name', '=', item.get('BoM Lines/Component'))], limit=1)

                if not product_component:
                    product_component = self.env['product.product'].create({
                        'name': item.get('BoM Lines/Component'),
                        'default_code': item.get('BoM Lines/Component/Internal Reference'),
                        'barcode': item.get('BoM Lines/Component/Barcode'),
                    })
                    warning_msg += f"\n◼ Componente nuevo creado en la fila {row}"

                components = {
                    'product_id': product_component.id,
                    'product_qty': item.get('BoM Lines/Quantity') or 1.0
                }
                vals['bom_line_ids'] = [(0, 0, components)]

            # Crear o actualizar BOM
            if product_tmpl:
                bom_id = self.env['mrp.bom'].search([
                    ('product_tmpl_id', '=', product_tmpl.id)
                ], limit=1)
                if bom_id and self.bom_component == 'add':
                    bom_id.write({'bom_line_ids': [(0, 0, components)]})
                    updated += 1
                else:
                    self.env['mrp.bom'].create(vals)
                    imported += 1

        if error_msg:
            raise ValidationError(error_msg)

        return {
            'effect': {
                'fadeout': 'slow',
                'message': f"✅ Importado: {imported}, Actualizado: {updated}{warning_msg}",
                'type': 'rainbow_man',
            }
        }

    def action_test_import_bom(self):
        if not self.file_upload:
            raise ValidationError("Por favor, sube un archivo válido antes de continuar.")

        datas = {}
        errors = ""

        # Cargar archivo CSV
        if self.file_type == 'csv':
            try:
                csv_data = base64.b64decode(self.file_upload)
                data_file = io.StringIO(csv_data.decode("utf-8"))
                data_file.seek(0)
                datas = csv.DictReader(data_file, delimiter=',')
            except Exception:
                raise ValidationError("Archivo CSV no válido.")

        # Cargar archivo XLS
        elif self.file_type == 'xls':
            try:
                fp = tempfile.NamedTemporaryFile(delete=False, suffix=".xls")
                fp.write(binascii.a2b_base64(self.file_upload))
                fp.seek(0)
                workbook = xlrd.open_workbook(fp.name)
                sheet = workbook.sheet_by_index(0)
                headers = sheet.row_values(0)
                datas = [
                    {k: v for k, v in zip(headers, sheet.row_values(i))}
                    for i in range(1, sheet.nrows)
                ]
            except Exception:
                raise ValidationError("Archivo XLS no válido.")

        row = 0

        for item in datas:
            row += 1

            # Verificar Producto
            if not item.get('Producto'):
                errors += f"Producto faltante en la fila {row}\n"

            # Validación de cantidad
            quantity = item.get('Cantidad')
            if quantity is None or quantity == "":
                errors += f"Cantidad faltante o vacía en la fila {row}\n"
            else:
                try:
                    # Verificar que la cantidad sea un número
                    float(quantity)
                except ValueError:
                    errors += f"Cantidad inválida en la fila {row}: {quantity}\n"

            # Validación de componentes (si se añaden componentes)
            if self.bom_component == 'add' and item.get('Componente de BoM'):
                component_error = False
                try:
                    # Verificar que la cantidad del componente sea un número
                    component_quantity = item.get('Líneas de BoM/Cantidad')
                    if component_quantity is None or component_quantity == "":
                        errors += f"Cantidad de componente faltante en la fila {row}\n"
                    else:
                        float(component_quantity)  # Verificar que sea un número
                except ValueError:
                    component_error = True
                if component_error:
                    errors += f"Cantidad de componente inválida en la fila {row}\n"

        # Si hay errores, lanzamos un mensaje de validación
        if errors:
            raise ValidationError(errors)

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Validación Exitosa',
                'message': 'El archivo fue validado correctamente',
                'sticky': False,
            }
        }

    def action_generate_template(self):
        """Genera una plantilla Excel para importar estructuras de BOM"""

        import base64
        from io import BytesIO
        import xlsxwriter

        # Encabezados requeridos en español
        field_labels = [
            "ID Externo",                       # External ID
            "Referencia",                       # Reference
            "Producto",                         # Producto
            "Cantidad",                         # Quantity
            "Tipo de Lista de Materiales",      # BoM Type
            "Componente de BoM",                # BoM Lines/Component
            "Cantidad de Componente"            # BoM Lines/Quantity
        ]

        # Crear Excel en memoria
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet("Plantilla de Importación de BOM")

        # Formato para encabezados
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9D9D9'})
        for col, label in enumerate(field_labels):
            worksheet.write(0, col, label, header_format)

        # Añadir una línea de ejemplo
        example_data = [
            "mrp_bom_1",                       # ID Externo
            "BOM_SC234",                        # Referencia
            "[FURN_7800] D",                    # Producto
            1.0,                                # Cantidad
            "Kit",                              # Tipo de Lista de Materiales
            "[FURN_2100] Drawer Black",         # Componente de BoM
            1.0                                 # Cantidad de Componente
        ]

        # Escribir los datos de ejemplo en la segunda fila
        for col, value in enumerate(example_data):
            worksheet.write(1, col, value)

        # Ajustar el ancho de las columnas automáticamente para que todo el texto sea visible
        for col in range(len(field_labels)):
            worksheet.set_column(col, col, max(len(str(value)) for value in [field_labels[col]] + [example_data[col]]))

        # Cerrar y preparar el archivo
        workbook.close()
        output.seek(0)

        # Crear adjunto
        attachment = self.env['ir.attachment'].create({
            'name': 'plantilla_importacion_bom.xlsx',
            'type': 'binary',
            'datas': base64.b64encode(output.read()).decode(),
            'mimetype': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        # Retornar archivo para descarga
        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }
