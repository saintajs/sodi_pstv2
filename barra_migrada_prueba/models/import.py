from odoo import models, fields, api
import logging
import base64
import csv
import io
import json
from datetime import datetime

_logger = logging.getLogger(__name__)

class BaseImport(models.Model):
    _inherit = 'base_import.import'

    processed_records = fields.Integer('Records Processed', default=0)
    total_records = fields.Integer('Total Records', default=0)

    @api.model
    def get_progress(self, import_id):
        """Obtiene el progreso actual de la importación"""
        try:
            record = self.browse(import_id)
            if not record:
                return {'processed': 0, 'total': 0}
            
            # Si no se ha establecido el total de registros, lo obtenemos
            if not record.total_records:
                preview_res = record.update_data(False)
                record.total_records = preview_res.get('file_length', 0)

            return {
                'processed': record.processed_records,
                'total': record.total_records,
            }
        except Exception as e:
            _logger.error(f"Error al obtener el progreso: {str(e)}")
            return {'processed': 0, 'total': 0}

    @api.model
    def update_progress(self, import_id, processed):
        """Actualiza el progreso de la importación"""
        try:
            record = self.browse(import_id)
            if record:
                record.processed_records = processed
                self.env.cr.commit()  # Aseguramos que los cambios se guarden inmediatamente
            return True
        except Exception as e:
            _logger.error(f"Error al actualizar el progreso: {str(e)}")
            return False

    @api.model
    def execute_import(self, fields, columns, options, dryrun=False):
        """ Actual execution of the import with progress tracking
        
        :param fields: import mapping: maps each column to a field,
                       ``False`` for the columns to ignore
        :type fields: list(str|bool)
        :param columns: columns label
        :type columns: list(str|bool)
        :param dict options:
        :param bool dryrun: performs all import operations (and
                            validations) but rollbacks writes, allows
                            getting as much errors as possible without
                            the risk of clobbering the database.
        :returns: A list of errors. If the list is empty the import
                  executed fully and correctly. If the list is
                  non-empty it contains dicts with 3 keys:

                  ``type``
                    the type of error (``error|warning``)
                  ``message``
                    the error message associated with the error (a string)
                  ``record``
                    the data which failed to import (or ``false`` if that data
                    isn't available or provided)
        :rtype: dict(ids: list(int), messages: list({type, message, record}))
        """
        try:
            _logger.info("Iniciando el proceso de importación...")
            
            # Primero obtenemos el total de registros
            preview_res = self.update_data(False)
            total_records = preview_res.get('file_length', 0)
            self.total_records = total_records
            
            _logger.info(f"Total de registros a importar: {total_records}")
            _logger.info(f"Modo dryrun: {dryrun}")
            
            # Verificamos la lectura del archivo CSV
            if not self.verify_csv_data():
                _logger.error("Error al verificar el archivo CSV")
                return {'messages': [{'type': 'error', 'message': 'Error al verificar el archivo CSV', 'record': False}]}
            
            # Verificamos las relaciones del modelo objetivo
            if not self.check_model_relationships():
                _logger.error("Error al verificar las relaciones del modelo")
                return {'messages': [{'type': 'error', 'message': 'Error al verificar las relaciones del modelo', 'record': False}]}
            
            # Llamamos al método padre para realizar la importación
            result = super().execute_import(fields, columns, options, dryrun)
            _logger.info(f"Resultado de la importación: {json.dumps(result, indent=2)}")
            
            # Si hay errores, devolvemos el resultado inmediatamente
            if result.get('messages'):
                _logger.error(f"Errores durante la importación: {result['messages']}")
                return result
            
            # Si es una importación real (no dryrun) y no hay errores
            if not dryrun:
                _logger.info("Ejecutando la importación real")
                
                # Actualizamos el progreso
                self.processed_records = total_records
                self.update_progress(self.id, total_records)
                
                # Verificamos si se crearon registros
                if not result.get('ids'):
                    # Intentamos forzar el commit de los cambios
                    self.env.cr.commit()
                    
                    # Buscamos los registros recién creados
                    model = self.env[self.res_model]
                    _logger.info(f"Buscando registros recién creados en modelo: {model._name}")
                    
                    # Usamos un rango de tiempo para encontrar los registros recién creados
                    now = fields.Datetime.now()
                    new_ids = model.search([
                        ('create_date', '>=', now),
                        ('create_uid', '=', self.env.user.id)
                    ])
                    
                    _logger.info(f"Registros encontrados después de la importación: {len(new_ids)}")
                    
                    # Verificar registros por campos específicos
                    if hasattr(model, 'name'):
                        created_records = model.search([('create_date', '>=', now)])
                        _logger.info(f"Registros creados con nombres: {created_records.mapped('name')}")
                    
                    if new_ids:
                        result['ids'] = new_ids.ids
                        _logger.info(f"Se crearon {len(new_ids)} registros exitosamente")
                    else:
                        _logger.error("No se encontraron registros recién creados")
                        return {'messages': [{'type': 'error', 'message': 'No se crearon registros durante la importación', 'record': False}]}
            
            return result
            
        except Exception as e:
            _logger.error(f"Error durante la importación: {str(e)}", exc_info=True)
            return {'messages': [{'type': 'error', 'message': str(e), 'record': False}]}

    @api.model
    def update_data(self, dryrun=True):
        """Actualiza los datos de la vista previa y el progreso"""
        try:
            _logger.info(f"Actualizando datos (dryrun={dryrun})...")
            
            # Llamamos al método padre para obtener los datos
            result = super().update_data(dryrun)
            
            # Verificar la longitud de los registros
            file_length = result.get('file_length', 0)
            _logger.info(f"Longitud de los registros en la vista previa: {file_length}")
            
            # Si no estamos en modo dryrun, actualizamos el progreso
            if not dryrun:
                self.processed_records = file_length
                self.update_progress(self.id, file_length)
            
            return result
        except Exception as e:
            _logger.error(f"Error al actualizar los datos: {str(e)}", exc_info=True)
            return {'messages': [{'type': 'error', 'message': str(e), 'record': False}]}

    @api.model
    def verify_csv_data(self):
        """Verifica la lectura del archivo CSV"""
        try:
            _logger.info("Iniciando verificación del CSV...")
            
            # Primero obtenemos el archivo
            file_content = self.file
            if not file_content:
                _logger.error("No se proporcionó archivo")
                return False
                
            # Convertimos el archivo a texto
            file_text = base64.b64decode(file_content).decode('utf-8')
            _logger.info(f"Datos CSV leídos: {file_text[:500]}")  # Log de los primeros 500 caracteres
            
            # Leemos el archivo CSV
            csv_data = io.StringIO(file_text)
            reader = csv.reader(csv_data)
            
            # Obtenemos los encabezados
            headers = next(reader)
            _logger.info(f"Encabezados del CSV: {headers}")
            
            # Contamos los registros
            row_count = sum(1 for row in reader)
            _logger.info(f"Número total de registros en el CSV: {row_count}")
            
            # Verificar si hay datos en las filas
            csv_data.seek(0)  # Volver al inicio del archivo
            next(reader)  # Saltar encabezados
            first_row = next(reader, None)
            if first_row:
                _logger.info(f"Primera fila de datos: {first_row}")
            else:
                _logger.error("No se encontraron datos en el archivo CSV")
                return False
            
            return True
            
        except Exception as e:
            _logger.error(f"Error al verificar el CSV: {str(e)}", exc_info=True)
            return False

    @api.model
    def check_model_relationships(self):
        """Verifica las relaciones del modelo objetivo"""
        try:
            model = self.env[self.res_model]
            _logger.info(f"Verificando relaciones del modelo {model._name}")
            
            # Obtener campos relacionados
            related_fields = []
            for field in model._fields.values():
                if field.type in ['many2one', 'many2many', 'one2many']:
                    related_fields.append(field)
            
            _logger.info(f"Campos relacionados encontrados: {[f.name for f in related_fields]}")
            
            return True
            
        except Exception as e:
            _logger.error(f"Error al verificar relaciones del modelo: {str(e)}", exc_info=True)
            return False