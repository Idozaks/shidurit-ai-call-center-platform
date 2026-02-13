import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import ArchitectChat from './ArchitectChat';
import ConfirmationModal from './ConfirmationModal';

export default function ArchitectOverlay({ onDismiss }) {
  const [showChat, setShowChat] = useState(false);
  const [buildConfig, setBuildConfig] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleBuildReady = (config) => {
    setBuildConfig(config);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setIsCreating(true);
    const tenantData = {
      ...buildConfig.tenant_config,
      is_active: true,
      usage_limit: 100
    };
    const newTenant = await base44.entities.Tenant.create(tenantData);

    if (buildConfig.knowledge_base?.length > 0) {
      for (const entry of buildConfig.knowledge_base) {
        await base44.entities.KnowledgeEntry.create({
          ...entry,
          tenant_id: newTenant.id,
          is_active: true
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    setIsCreating(false);
    setShowConfirm(false);
    navigate(createPageUrl('TenantDashboard') + `?id=${newTenant.id}`);
  };

  if (!showChat) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex items-center justify-center p-6"
        dir="rtl"
      >
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 text-white/60 hover:text-white hover:bg-white/10"
            onClick={onDismiss}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            בוא נבנה את בוט שירות הלקוחות שלך
          </h1>
          <p className="text-white/80 text-lg mb-8">
            ב-2 דקות בלבד, אדריכל שידורית ילמד את העסק שלך ויבנה בוט AI מותאם אישית
          </p>
          <Button
            size="lg"
            className="bg-white text-indigo-700 hover:bg-white/90 text-lg px-8 py-6 rounded-xl shadow-xl gap-2"
            onClick={() => setShowChat(true)}
          >
            <Sparkles className="w-5 h-5" />
            בוא נתחיל!
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-indigo-600 to-violet-600">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold">אדריכל שידורית</span>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10" onClick={onDismiss}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <ArchitectChat mode="create" onBuildReady={handleBuildReady} />
      </div>
      <ConfirmationModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        config={buildConfig}
        onConfirm={handleConfirm}
        onEdit={() => setShowConfirm(false)}
        isCreating={isCreating}
      />
    </div>
  );
}