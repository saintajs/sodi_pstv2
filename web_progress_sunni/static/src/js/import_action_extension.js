    /** @odoo-module **/

import { registry } from '@web/core/registry';
import { ImportAction as BaseImportAction } from '@base_import/import_action/import_action';
import { _t } from '@web/core/l10n/translation';
import { ImportDataProgress } from '@base_import/import_data_progress/import_data_progress';

export class ImportAction extends BaseImportAction {
    async setup() {
        super.setup();
        this.progress = 0;
        // No necesitamos inicializar el modelo, ya viene inicializado
    }

    async handleFilesUpload(files) {
        if (!files || files.length <= 0) {
            return;
        }

        this.state.filename = files[0].name;
        this.state.importMessages = [];

        // Crear elementos del DOM
        const progressContainer = document.createElement('div');
        progressContainer.className = 'import-progress-container';

        // Botón del menú
        const menuButton = document.createElement('div');
        menuButton.className = 'menu-button';

        // Menú desplegable
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';

        // Opciones del menú
        const optionA = document.createElement('div');
        optionA.className = 'menu-item';
        optionA.textContent = 'Standar';
        
        const optionB = document.createElement('div');
        optionB.className = 'menu-item';
        optionB.textContent = 'Nyancat';

        const optionC = document.createElement('div');
        optionC.className = 'menu-item';
        optionC.textContent = 'Modern';

        dropdownMenu.appendChild(optionA);
        dropdownMenu.appendChild(optionB);
        dropdownMenu.appendChild(optionC);

        // Contenido principal
        const message = document.createElement('div');
        message.className = 'import-message';
        message.textContent = _t("Subiendo archivo...");

        // Contenedor para el porcentaje estándar (solo para la vista estándar)
        const standardPercentageContainer = document.createElement('div');
        standardPercentageContainer.className = 'standard-percentage-container';
        standardPercentageContainer.style.display = 'none'; // Oculto por defecto
        
        const standardPercentage = document.createElement('div');
        standardPercentage.className = 'standard-percentage';
        standardPercentage.textContent = '0%';
        standardPercentageContainer.appendChild(standardPercentage);

        // Barra de progreso Nyancat (por defecto)
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressEl = document.createElement('div');
        progressEl.className = 'progress';
        progressBar.appendChild(progressEl);

        const nyanCat = document.createElement('img');
        nyanCat.src = '/barra_migrada_prueba/static/src/img/nyanimated.gif';
        nyanCat.className = 'nyan-cat';
        progressBar.appendChild(nyanCat);

        const percentageEl = document.createElement('div');
        percentageEl.className = 'progress-percentage';
        percentageEl.textContent = '0%';

        // Barra de progreso Moderna (oculta por defecto)
        const modernBar = document.createElement('div');
        modernBar.className = 'progress-bar-modern';
        modernBar.style.display = 'none';
        
        const modernProgress = document.createElement('div');
        modernProgress.className = 'progress-modern';
        modernBar.appendChild(modernProgress);
        
        const modernPercentage = document.createElement('div');
        modernPercentage.className = 'progress-percentage-modern';
        modernPercentage.textContent = '0%';
        modernPercentage.style.display = 'none';

        // Añadir elementos al contenedor
        progressContainer.appendChild(menuButton);
        progressContainer.appendChild(dropdownMenu);
        progressContainer.appendChild(message);
        progressContainer.appendChild(standardPercentageContainer);  // Añadir el contenedor del porcentaje
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(percentageEl);
        progressContainer.appendChild(modernBar);
        progressContainer.appendChild(modernPercentage);

        document.body.appendChild(progressContainer);

        // Variables para el progreso
        let currentProgress = 0;
        let progressInterval;
        let isUploadComplete = false;
        const progressBarWidth = 600;
        const nyanCatWidth = 90;
        const halfCatWidth = nyanCatWidth / 2;
        let lastUpdateTime = 0;
        const minUpdateInterval = 50;

        // Función para calcular el incremento de progreso basado en el tiempo
        const calculateIncrement = (targetProgress) => {
            const now = Date.now();
            if (now - lastUpdateTime < minUpdateInterval) {
                return currentProgress;
            }
            lastUpdateTime = now;
            
            if (isUploadComplete) {
                const remaining = 100 - currentProgress;
                return currentProgress + Math.max(0.5, remaining * 0.1);
            }
            
            return currentProgress + (0.2 + Math.random() * 0.3);
        };

        // Función para actualizar la barra de progreso de Nyancat
        const updateProgressNyancat = (targetProgress) => {
            currentProgress = Math.min(targetProgress, 100);
            
            // Actualizar porcentaje estándar
            standardPercentage.textContent = `${Math.round(currentProgress)}%`;
            
            let maxBarWidth = progressBarWidth - halfCatWidth;
            let progressWidthPx = (currentProgress / 100) * maxBarWidth;
            let progressWidthPercent = (progressWidthPx / progressBarWidth) * 100;

            progressEl.style.width = `${progressWidthPercent}%`;
            percentageEl.textContent = `${Math.round(currentProgress)}%`;
            modernPercentage.textContent = `${Math.round(currentProgress)}%`; // Actualizar también el porcentaje moderno
            modernProgress.style.width = `${progressWidthPercent}%`; // Actualizar también la barra moderna

            let leftPx = progressWidthPx - halfCatWidth;
            if (leftPx < 0) leftPx = 0;
            if (leftPx > progressBarWidth - nyanCatWidth) leftPx = progressBarWidth - nyanCatWidth;

            nyanCat.style.left = `${leftPx}px`;

            if (currentProgress >= 100 && progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
        };

        // Función para animar el progreso
        const animateProgress = () => {
            const targetProgress = isUploadComplete ? 100 : 95;
            
            if (currentProgress < targetProgress) {
                const newProgress = calculateIncrement(targetProgress);
                updateProgressNyancat(newProgress);
            }
        };

        // Iniciar la animación del progreso
        progressInterval = setInterval(animateProgress, 16);
        lastUpdateTime = Date.now();

        // Event listeners para el menú
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Lógica de opciones del menú
        optionA.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar solo el porcentaje (vista estándar)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'flex';  // Mostrar solo el porcentaje
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
        });

        optionB.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar vista Nyancat (como estaba originalmente)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = '';  // Mostrar la barra Nyancat
            percentageEl.style.display = '';  // Mostrar el porcentaje de Nyancat
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
        });

        optionC.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar vista moderna (como estaba originalmente)
            progressContainer.classList.add('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'block';  // Mostrar la barra moderna
            modernPercentage.style.display = 'block';  // Mostrar el porcentaje moderno
        });

        try {
            this.model.block();

            // Inicializar con estilo Nyancat por defecto (como estaba originalmente)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = '';  // Mostrar la barra Nyancat
            percentageEl.style.display = '';  // Mostrar el porcentaje de Nyancat
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
            
            // Simular progreso de carga
            const simulateUpload = () => {
                return new Promise((resolve) => {
                    const uploadInterval = setInterval(() => {
                        if (currentProgress >= 95) {
                            clearInterval(uploadInterval);
                            isUploadComplete = true;
                            
                            // Esperar a que la animación llegue al 100%
                            const checkCompletion = setInterval(() => {
                                if (currentProgress >= 100) {
                                    clearInterval(checkCompletion);
                                    resolve();
                                }
                            }, 100);
                        }
                    }, 100);
                });
            };

            // Iniciar la carga del archivo
            const { res, error } = await this.model.updateData(true);
            
            // Marcar como completado y esperar a que la animación termine
            isUploadComplete = true;
            await new Promise(resolve => {
                const checkCompletion = setInterval(() => {
                    if (currentProgress >= 100) {
                        clearInterval(checkCompletion);
                        resolve();
                    }
                }, 100);
            });

            if (error) {
                this.state.previewError = error;
            } else {
                this.state.fileLength = res.file_length;
                this.state.previewError = undefined;
            }
        } finally {
            // Limpiar el intervalo si aún existe
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            
            this.model.unblock();
            
            // Eliminar el contenedor después de un retraso
            setTimeout(() => {
                if (progressContainer && progressContainer.parentNode) {
                    progressContainer.remove();
                }
            }, 1000);
        }
    }

    async handleImport(isTest = true) {
        // Crear elementos del DOM
        const progressContainer = document.createElement('div');
        progressContainer.className = 'import-progress-container';

        // Botón del menú
        const menuButton = document.createElement('div');
        menuButton.className = 'menu-button';

        // Menú desplegable
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';

        // Opciones del menú
        const optionA = document.createElement('div');
        optionA.className = 'menu-item';
        optionA.textContent = 'Standar';
        
        const optionB = document.createElement('div');
        optionB.className = 'menu-item';
        optionB.textContent = 'Nyancat';

        const optionC = document.createElement('div');
        optionC.className = 'menu-item';
        optionC.textContent = 'Modern';

        dropdownMenu.appendChild(optionA);
        dropdownMenu.appendChild(optionB);
        dropdownMenu.appendChild(optionC);

        // Contenido principal
        const message = document.createElement('div');
        message.className = 'import-message';
        message.textContent = _t("Procesando importación...");

        // Contenedor para el porcentaje estándar (inicialmente oculto)
        const standardPercentageContainer = document.createElement('div');
        standardPercentageContainer.className = 'standard-percentage-container';
        standardPercentageContainer.style.display = 'none';
        
        const standardPercentage = document.createElement('div');
        standardPercentage.className = 'standard-percentage';
        standardPercentage.textContent = '0%';
        standardPercentageContainer.appendChild(standardPercentage);

        // Barra de progreso Nyancat (por defecto)
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressEl = document.createElement('div');
        progressEl.className = 'progress';
        progressBar.appendChild(progressEl);

        const nyanCat = document.createElement('img');
        nyanCat.src = '/barra_migrada_prueba/static/src/img/nyanimated.gif';
        nyanCat.className = 'nyan-cat';
        progressBar.appendChild(nyanCat);

        const percentageEl = document.createElement('div');
        percentageEl.className = 'progress-percentage';
        percentageEl.textContent = '0%';

        // Barra de progreso Moderna (oculta por defecto)
        const modernBar = document.createElement('div');
        modernBar.className = 'progress-bar-modern';
        modernBar.style.display = 'none';
        
        const modernProgress = document.createElement('div');
        modernProgress.className = 'progress-modern';
        modernBar.appendChild(modernProgress);
        
        const modernPercentage = document.createElement('div');
        modernPercentage.className = 'progress-percentage-modern';
        modernPercentage.textContent = '0%';
        modernPercentage.style.display = 'none';

        // Añadir todo al contenedor
        progressContainer.appendChild(menuButton);
        progressContainer.appendChild(dropdownMenu);
        progressContainer.appendChild(message);
        progressContainer.appendChild(standardPercentageContainer);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(percentageEl);
        progressContainer.appendChild(modernBar);
        progressContainer.appendChild(modernPercentage);

        document.body.appendChild(progressContainer);

        // Variables para el progreso
        let currentProgress = 0;
        let progressInterval;
        let isImportComplete = false;
        const progressBarWidth = 600;
        const nyanCatWidth = 90;
        const halfCatWidth = nyanCatWidth / 2;
        let lastUpdateTime = 0;
        const minUpdateInterval = 50;

        // Función para calcular el incremento de progreso basado en el tiempo
        const calculateIncrement = (targetProgress) => {
            const now = Date.now();
            if (now - lastUpdateTime < minUpdateInterval) {
                return currentProgress;
            }
            lastUpdateTime = now;
            
            if (isImportComplete) {
                const remaining = 100 - currentProgress;
                return currentProgress + Math.max(0.5, remaining * 0.1);
            }
            
            return currentProgress + (0.2 + Math.random() * 0.3);
        };

        // Función para actualizar la barra de progreso
        const updateProgressNyancat = (targetProgress) => {
            currentProgress = Math.min(targetProgress, 100);
            
            // Actualizar porcentaje estándar
            standardPercentage.textContent = `${Math.round(currentProgress)}%`;
            
            let maxBarWidth = progressBarWidth - halfCatWidth;
            let progressWidthPx = (currentProgress / 100) * maxBarWidth;
            let progressWidthPercent = (progressWidthPx / progressBarWidth) * 100;

            progressEl.style.width = `${progressWidthPercent}%`;
            percentageEl.textContent = `${Math.round(currentProgress)}%`;
            modernPercentage.textContent = `${Math.round(currentProgress)}%`;
            modernProgress.style.width = `${progressWidthPercent}%`;

            let leftPx = progressWidthPx - halfCatWidth;
            if (leftPx < 0) leftPx = 0;
            if (leftPx > progressBarWidth - nyanCatWidth) leftPx = progressBarWidth - nyanCatWidth;

            nyanCat.style.left = `${leftPx}px`;

            if (currentProgress >= 100 && progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
        };

        // Función para animar el progreso
        const animateProgress = () => {
            const targetProgress = isImportComplete ? 100 : 95;
            
            if (currentProgress < targetProgress) {
                const newProgress = calculateIncrement(targetProgress);
                updateProgressNyancat(newProgress);
            }
        };

        // Iniciar la animación del progreso
        progressInterval = setInterval(animateProgress, 16);
        lastUpdateTime = Date.now();

        // Event listeners para el menú
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Lógica de opciones del menú
        optionA.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar solo el porcentaje (vista estándar)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'flex';  // Mostrar solo el porcentaje
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
        });

        optionB.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar vista Nyancat (como estaba originalmente)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = '';  // Mostrar la barra Nyancat
            percentageEl.style.display = '';  // Mostrar el porcentaje de Nyancat
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
        });

        optionC.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar vista moderna
            progressContainer.classList.add('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'block';  // Mostrar la barra moderna
            modernPercentage.style.display = 'block';  // Mostrar el porcentaje moderno
        });

        try {
            // Bloquear la interfaz
            this.model.block();

            // Iniciar la importación
            const importPromise = super.handleImport(isTest);
            
            // Simular progreso de importación
            const simulateImportProgress = () => {
                if (currentProgress < 95) {
                    const newProgress = calculateIncrement(95);
                    updateProgressNyancat(newProgress);
                    setTimeout(simulateImportProgress, 50);
                }
            };
            
            simulateImportProgress();
            
            // Esperar a que la importación se complete
            const result = await importPromise;
            
            // Completar el progreso al 100%
            isImportComplete = true;
            updateProgressNyancat(100);
            
            // Mostrar notificación de éxito si no es una prueba
            if (!isTest) {
                this.notification.add(_t("Importación completada exitosamente"), {
                    type: "success",
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('Error durante la importación:', error);
            this.notification.add(_t("Error durante la importación: ") + (error.message || error), {
                type: "danger",
            });
            throw error;
        } finally {
            // Limpiar el intervalo si existe
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            
            // Desbloquear la interfaz
            this.model.unblock();
            
            // Eliminar el contenedor de progreso después de un retraso
            setTimeout(() => {
                if (progressContainer && progressContainer.parentNode) {
                    progressContainer.remove();
                }
            }, 1000);
        }
    }

    destroy() {
        isDestroyed = true;
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }
}

registry.category('actions').add('import', ImportAction, { force: true });