import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import ArchitectChat from './ArchitectChat';
import ConfirmationModal from './ConfirmationModal';
import ConfigEditorModal from './ConfigEditorModal';

export default function ArchitectDrawer({ open, onOpenChange, tenant, knowledge, tenantId }) {
  const [buildConfig, setBuildConfig] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleBuildReady = (config) => {
    setBuildConfig(config);
    setShowConfirm(true);
  };

  const handleEdit = () => {
    setShowConfirm(false);
    setShowEditor(true);
  };

  const handleEditorConfirm = async (editedConfig) => {
    setBuildConfig(editedConfig);
    await doConfirm(editedConfig);
  };

  const doConfirm = async (config) => {
    setIsCreating(true);
    const { tenant_config, knowledge_base } = config;

    // Update existing tenant
    await base44.entities.Tenant.update(tenantId, {
      company_name: tenant_config.company_name || tenant.company_name,
      ai_persona_name: tenant_config.ai_persona_name || tenant.ai_persona_name,
      system_prompt: tenant_config.system_prompt || tenant.system_prompt,
      welcome_message: tenant_config.welcome_message || tenant.welcome_message,
      theme_color: tenant_config.theme_color || tenant.theme_color,
    });

    // Add new knowledge entries
    if (knowledge_base?.length > 0) {
      for (const entry of knowledge_base) {
        await base44.entities.KnowledgeEntry.create({
          ...entry,
          tenant_id: tenantId,
          is_active: true
        });
      }
    }

    // Save original uploaded source files as knowledge entries for reference
    if (config.source_files?.length > 0) {
      for (const sf of config.source_files) {
        await base44.entities.KnowledgeEntry.create({
          tenant_id: tenantId,
          title: `📎 קובץ מקור: ${sf.name}`,
          content: `קובץ מקור שהועלה דרך האדריכל. ניתן להוריד את הקובץ דרך הקישור המצורף.`,
          category: 'general',
          file_url: sf.url,
          file_name: sf.name,
          is_active: true
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['knowledge', tenantId] });
    setIsCreating(false);
    setShowConfirm(false);
    setShowEditor(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col" dir="rtl">
          <SheetHeader className="p-4 border-b bg-gradient-to-l from-indigo-600 to-violet-600">
            <SheetTitle className="text-white flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4" />
              אדריכל שידורית - {tenant?.company_name}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ArchitectChat
              mode="update"
              tenant={tenant}
              knowledge={knowledge}
              onBuildReady={handleBuildReady}
            />
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmationModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        config={buildConfig}
        onConfirm={() => doConfirm(buildConfig)}
        onEdit={handleEdit}
        isCreating={isCreating}
      />
      <ConfigEditorModal
        open={showEditor}
        onOpenChange={setShowEditor}
        config={buildConfig}
        onConfirm={handleEditorConfirm}
        isCreating={isCreating}
      />
    </>
  );
}