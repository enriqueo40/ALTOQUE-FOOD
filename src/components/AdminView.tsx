
            <SettingsCard title="Número de WhatsApp para pedidos" onSave={onSave} onCancel={handleCancel}>
                <p className="text-sm text-gray-500 dark:text-gray-400">El número al que llegarán las comandas de los pedidos a domicilio y para recoger.</p>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de contacto (Solo dígitos)</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm">
                            <IconWhatsapp className="h-4 w-4" />
                        </span>
                        <input 
                            type="text" 
                            value={settings.branch.whatsappNumber} 
                            onChange={e => setSettings(p => ({...p, branch: {...p.branch, whatsappNumber: e.target.value}}))} 
                            className="flex-1 min-w-0 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-none rounded-r-md focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-white"
                            placeholder="Ej. 584146945877"
                        />
                    </div>
                </div>
            </SettingsCard>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
