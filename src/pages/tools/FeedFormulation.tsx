import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, History, FileDown, CheckCircle2, X, Calculator as CalcIcon, Sprout, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';

import { saveToMasterData } from '../../services/ingredientService';

// Type Definitions
export interface Ingredient {
  id: string;
  category: string;
  name: string;
  weightPerPack: number;
  pricePerPack: number;
  amountUsed: number;
  unit: 'bag' | 'kg';
}

export type PigStage = 'หมูเล็ก' | 'หมูรุ่น' | 'หมูขุน' | 'แม่หมู' | 'อื่นๆ';

export interface FeedRecipe {
  id?: string;
  userId: string;
  recipeName: string;
  recipeType: PigStage;
  ingredients: Ingredient[];
  totalWeight: number;
  totalCost: number;
  avgCostPerKg: number;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_CATEGORIES = ["วัตถุดิบหลัก", "วิตามิน/อาหารเสริม", "กลุ่มยา"];

// Custom hook for localStorage (Auto-Save)
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue] as const;
}

export default function FeedFormulation() {
  const navigate = useNavigate();
  const { user: currentUser, userProfile } = useAuth();
  const { showAlert } = useBottomSheet();
  
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [currentRecipeId, setCurrentRecipeId] = useLocalStorage<string | null>('draftFeedRecipeId', null);
  const [recipeName, setRecipeName] = useLocalStorage<string>('draftFeedRecipeName', '');
  const [recipeType, setRecipeType] = useLocalStorage<PigStage>('draftFeedRecipeType', 'อื่นๆ');
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('draftFeedIngredients', []);
  const [customCategories, setCustomCategories] = useLocalStorage<string[]>('customFeedCategories', []);
  const [knownNames, setKnownNames] = useLocalStorage<string[]>('knownIngredientNames', []);

  // Set initial view mode based on draft
  useEffect(() => {
    if (currentRecipeId || ingredients.length > 0) {
      setViewMode('edit');
    } else {
      setViewMode('list');
    }
  }, []);

  // History & Save States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'feed_recipes')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Client-side sort to avoid requiring a composite index
      recipes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setSavedRecipes(recipes);
    }, (error) => {
      console.warn("Could not listen to feed_recipes from Firestore:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formCategory, setFormCategory] = useState('วัตถุดิบหลัก');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [formName, setFormName] = useState('');
  const [formWeight, setFormWeight] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formUnit, setFormUnit] = useState<'bag' | 'kg'>('bag');

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  // Logic for default unit based on category
  useEffect(() => {
    if (formCategory === 'วิตามิน/อาหารเสริม' || formCategory === 'กลุ่มยา') {
      setFormUnit('kg');
    }
  }, [formCategory]);

  const summary = useMemo(() => {
     let totalWeight = 0;
     let totalCost = 0;
     ingredients.forEach(ing => {
        let weight = 0, cost = 0;
        if (ing.unit === 'bag') {
            weight = ing.weightPerPack * ing.amountUsed;
            cost = ing.pricePerPack * ing.amountUsed;
        } else {
            weight = ing.amountUsed;
            cost = ing.weightPerPack > 0 ? (ing.pricePerPack / ing.weightPerPack) * ing.amountUsed : 0;
        }
        totalWeight += weight;
        totalCost += cost;
     });
     return {
        totalWeight,
        totalCost,
        avgCostPerKg: totalWeight > 0 ? totalCost / totalWeight : 0
     };
  }, [ingredients]);

  const handleOpenModal = (ing?: Ingredient) => {
    if (ing) {
      setEditingId(ing.id);
      setFormCategory(ing.category);
      setFormName(ing.name);
      setFormWeight(ing.weightPerPack.toString());
      setFormPrice(ing.pricePerPack.toString());
      setFormAmount(ing.amountUsed.toString());
      setFormUnit(ing.unit);
      setIsAddingCustomCategory(false);
    } else {
      setEditingId(null);
      setFormCategory('วัตถุดิบหลัก');
      setFormName('');
      setFormWeight('');
      setFormPrice('');
      setFormAmount('');
      setFormUnit('bag');
      setIsAddingCustomCategory(false);
    }
    setIsModalOpen(true);
  };

  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    let finalCategory = formCategory;
    
    if (isAddingCustomCategory && newCategoryName.trim()) {
       finalCategory = newCategoryName.trim();
       if (!allCategories.includes(finalCategory)) {
         setCustomCategories([...customCategories, finalCategory]);
       }
    }

    if (formName.trim() && !knownNames.includes(formName.trim())) {
      setKnownNames([...knownNames, formName.trim()]);
    }

    const newIng: Ingredient = {
      id: editingId || Date.now().toString(),
      category: finalCategory,
      name: formName.trim(),
      weightPerPack: Number(formWeight) || 0,
      pricePerPack: Number(formPrice) || 0,
      amountUsed: Number(formAmount) || 0,
      unit: formUnit
    };

    if (editingId) {
      setIngredients(ingredients.map(i => i.id === editingId ? newIng : i));
    } else {
      setIngredients([...ingredients, newIng]);
    }

    // Sync with Master Data for AI matching
    saveToMasterData(
      newIng.name, 
      newIng.category, 
      newIng.pricePerPack, 
      newIng.weightPerPack, 
      newIng.unit
    ).catch(err => console.error("Sync to master data failed:", err));

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('คุณต้องการลบวัตถุดิบนี้ใช่หรือไม่?')) {
      setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  const calculateItem = (ing: Ingredient) => {
    let weight = 0, cost = 0;
    if (ing.unit === 'bag') {
        weight = ing.weightPerPack * ing.amountUsed;
        cost = ing.pricePerPack * ing.amountUsed;
    } else {
        weight = ing.amountUsed;
        cost = ing.weightPerPack > 0 ? (ing.pricePerPack / ing.weightPerPack) * ing.amountUsed : 0;
    }
    return { weight, cost };
  };

  useEffect(() => {
    if (!currentUser) return;
    if (!recipeName.trim() || ingredients.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const recipeData = {
          userId: currentUser.uid,
          recipeName: recipeName.trim(),
          recipeType,
          ingredients,
          totalWeight: summary.totalWeight,
          totalCost: summary.totalCost,
          avgCostPerKg: summary.avgCostPerKg,
          recordedBy: userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'พนักงาน',
          updatedAt: Date.now()
        };

        if (currentRecipeId) {
          await updateDoc(doc(db, 'feed_recipes', currentRecipeId), recipeData);
        } else {
          const docRef = await addDoc(collection(db, 'feed_recipes'), {
            ...recipeData,
            createdAt: Date.now()
          });
          setCurrentRecipeId(docRef.id);
        }
      } catch (err: any) {
        console.error("Auto-save failed:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [recipeName, recipeType, ingredients, summary, currentUser, currentRecipeId]);

  const handleSaveRecipe = async (asNew: boolean = false) => {
    if (!currentUser) return alert('กรุณาเข้าสู่ระบบก่อนบันทึก');
    if (!recipeName.trim()) return alert('กรุณาตั้งชื่อสูตรอาหาร');
    if (ingredients.length === 0) return alert('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ');

    try {
      setIsSaving(true);
      const recipeData = {
        userId: currentUser.uid,
        recipeName: recipeName.trim(),
        recipeType,
        ingredients,
        totalWeight: summary.totalWeight,
        totalCost: summary.totalCost,
        avgCostPerKg: summary.avgCostPerKg,
        recordedBy: userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'พนักงาน',
        updatedAt: Date.now()
      };

      if (currentRecipeId && !asNew) {
        // Update existing
        await updateDoc(doc(db, 'feed_recipes', currentRecipeId), recipeData);
        showAlert('อัปเดตสูตรปัจจุบันเรียบร้อย');
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'feed_recipes'), {
          ...recipeData,
          createdAt: Date.now()
        });
        setCurrentRecipeId(docRef.id);
        showAlert('บันทึกเป็นสูตรใหม่เรียบร้อย');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadRecipe = (recipe: any) => {
    setCurrentRecipeId(recipe.id);
    setRecipeName(recipe.recipeName);
    setRecipeType(recipe.recipeType || 'อื่นๆ');
    setIngredients(recipe.ingredients || []);
    setIsHistoryOpen(false);
    setViewMode('edit');
  };

  const startNewRecipe = (type?: PigStage) => {
    setCurrentRecipeId(null);
    const defaultName = type ? `สูตร${type} (ใหม่)` : '';
    setRecipeName(defaultName);
    setRecipeType(type || 'อื่นๆ');
    setIngredients([]);
    setViewMode('edit');
  };

  const handleExportPDF = () => {
    showAlert('ระบบกำลังสั่งพิมพ์.. \n\n* หากหน้าต่างการพิมพ์ไม่ขึ้น กรุณากดปุ่ม "Open in new tab" (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่มุมขวาบนสุดของจอก่อนพิมพ์ครับ', 'กำลังสั่งพิมพ์...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const clearCurrentRecipe = () => {
    if (window.confirm('ต้องการล้างข้อมูลเพื่อเริ่มสูตรใหม่ใช่หรือไม่?')) {
      startNewRecipe();
    }
  };

  return (
    <>
      {viewMode === 'list' ? (
        <div className="w-full content-area pb-32 animate-in fade-in duration-300">
        
        {/* Top Navigation */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-905 hover:bg-slate-200/80 dark:hover:text-white bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl border border-slate-200/50 dark:border-white/5 transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#00bcd4] group-hover:-translate-x-0.5 transition-transform" />
            <span>กลับหน้าหลัก (Dashboard)</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">สูตรคำนวณอาหาร</h1>
            <p className="text-slate-500 dark:text-white/50 font-medium">เลือกหมวดหมู่ที่ต้องการสร้าง หรือดูประวัติสูตรที่บันทึกไว้</p>
          </div>
          <History className="w-8 h-8 text-slate-300 dark:text-white/10" />
        </div>

        {/* Quick Start Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'หมูเล็ก', icon: '🐣', color: 'from-amber-400 to-orange-500' },
            { label: 'หมูรุ่น', icon: '🐖', color: 'from-emerald-400 to-teal-500' },
            { label: 'หมูขุน', icon: '🐖', color: 'from-blue-400 to-indigo-500' },
            { label: 'แม่หมู', icon: '🐖', color: 'from-pink-400 to-rose-500' }
          ].map((item) => (
            <motion.button
              key={item.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startNewRecipe(item.label as PigStage)}
              className="relative overflow-hidden group p-6 rounded-[2.5rem] bg-white dark:bg-[#0a2e36] border border-slate-200 dark:border-white/10 text-left shadow-sm active:shadow-inner transition-all"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-black text-slate-900 dark:text-white text-xl">สูตร{item.label}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">สร้างใหม่</p>
            </motion.button>
          ))}
        </div>

        {/* Saved Recipes Dashboard */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-white/90">สูตรที่บันทึกไว้ ({savedRecipes.length})</h2>
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="text-sm font-bold text-emerald-500 hover:underline"
            >
              ดูทั้งหมด
            </button>
          </div>

          {savedRecipes.length === 0 ? (
            <div className="bg-white dark:bg-[#0a2e36] p-12 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 text-center">
              <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-400">ยังไม่มีสูตรที่บันทึกไว้</p>
              <p className="text-sm text-slate-400 mt-1">เริ่มสร้างสูตรแรกของคุณได้จากปุ่มด้านบน</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {savedRecipes.slice(0, 6).map((recipe) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={recipe.id}
                    onClick={() => handleLoadRecipe(recipe)}
                    className="p-6 bg-white dark:bg-[#0a2e36] rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all cursor-pointer group flex flex-col justify-between h-56"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          recipe.recipeType === 'หมูเล็ก' ? 'bg-amber-100 text-amber-600' :
                          recipe.recipeType === 'หมูรุ่น' ? 'bg-emerald-100 text-emerald-600' :
                          recipe.recipeType === 'หมูขุน' ? 'bg-blue-100 text-blue-600' :
                          recipe.recipeType === 'แม่หมู' ? 'bg-pink-100 text-pink-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {recipe.recipeType}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(recipe.updatedAt).toLocaleDateString('th-TH')}</p>
                      </div>
                      <h3 className="font-black text-2xl text-slate-900 dark:text-white leading-tight group-hover:text-emerald-500 transition-colors line-clamp-2">
                        {recipe.recipeName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-50 dark:border-white/5">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ต้นทุนเฉลี่ย</p>
                        <p className="font-black text-emerald-500 text-lg">฿{(recipe.avgCostPerKg || 0).toFixed(2)}<span className="text-[10px] ml-1">/กก.</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">นัดหมายรวม</p>
                        <p className="font-black text-slate-900 dark:text-white text-lg">{(recipe.totalWeight || 0).toLocaleString()}<span className="text-[10px] ml-1">กก.</span></p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      ) : (
      <div className="w-full content-area pb-32 animate-in fade-in duration-300">
      
      {/* Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 -mx-4 px-4 w-[calc(100%+2rem)]">
        <button 
          onClick={() => setViewMode('list')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl transition-colors font-medium border border-slate-200 dark:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้ารวม
        </button>
        <div className="flex items-center gap-2">
          {currentRecipeId ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${isSaving ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>
              {isSaving ? (
                 <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
              ) : (
                 <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว (Auto-save)</>
              )}
            </div>
          ) : null}
          <button 
            onClick={clearCurrentRecipe}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-xl transition-colors font-medium ml-2"
          >
            <Plus className="w-4 h-4" />
            เริ่มสูตรใหม่
          </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-[#0a2e36] p-0 rounded-xl overflow-hidden">
        {/* Header & Main Info */}
      <div className="bg-white dark:bg-[#0a2e36]/40 px-4 py-5 mb-6 flex items-center gap-4 -mx-4 w-[calc(100%+2rem)] border-b border-slate-200 dark:border-white/10">
        <div className="p-3 bg-pink-500/20 rounded-xl text-pink-500 shrink-0">
          <CalcIcon className="w-6 h-6" />
        </div>
        <div className="w-full">
          <input 
            type="text" 
            placeholder="ชื่อสูตรอาหาร (เช่น สูตรหมูขุนระยะ 2)"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-pink-500 focus:ring-0 p-0 text-xl font-bold text-slate-800 dark:text-white transition-colors"
          />
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">จัดการสูตรและคำนวณต้นทุน</p>
        </div>
      </div>

      {/* Ingredients List */}
      <div className="bg-white dark:bg-[#0a2e36]/40 px-4 py-5 mb-6 -mx-4 w-[calc(100%+2rem)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">รายการวัตถุดิบ</h2>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors text-sm font-bold shadow-sm no-print"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม
          </button>
        </div>

        {ingredients.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sprout className="w-8 h-8 text-slate-400 dark:text-white/30" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-white/90 mb-1">ยังไม่มีวัตถุดิบ</h3>
            <p className="text-slate-500 dark:text-white/60 text-sm">กดปุ่มเพิ่มวัตถุดิบเพื่อเริ่มคำนวณสูตรอาหาร</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                 <tr className="border-b border-slate-200 dark:border-white/10 text-xs sm:text-sm uppercase tracking-wider text-slate-500 dark:text-white/50 bg-slate-50 dark:bg-white/5">
                   <th className="p-4 font-bold text-center w-12">#</th>
                   <th className="p-4 font-bold min-w-[200px]">ชื่อวัตถุดิบ / หมวดหมู่</th>
                   <th className="p-4 font-bold text-right">บรรจุ (KG)</th>
                   <th className="p-4 font-bold text-right">ราคา (฿)</th>
                   <th className="p-4 font-bold text-right">ปริมาณใช้</th>
                   <th className="p-4 font-bold text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5">น้ำหนักได้ (KG)</th>
                   <th className="p-4 font-bold text-right text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/5">ต้นทุน (฿)</th>
                   <th className="p-4 font-bold text-center w-24 no-print">จัดการ</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {ingredients.map((ing, index) => {
                  const res = calculateItem(ing);
                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 text-center font-medium text-slate-400">{index + 1}</td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-900 dark:text-white text-base">{ing.name}</div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-white/50 mt-1 inline-block px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-md truncate max-w-full">{ing.category}</div>
                      </td>
                      <td className="p-4 text-right align-top text-slate-700 dark:text-white/80 font-medium">{ing.weightPerPack.toLocaleString()}</td>
                      <td className="p-4 text-right align-top text-slate-700 dark:text-white/80 font-medium">{ing.pricePerPack.toLocaleString()}</td>
                      <td className="p-4 text-right align-top">
                        <div className="inline-flex items-baseline gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                          <span className="text-base font-bold text-slate-800 dark:text-white/90">{ing.amountUsed}</span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-white/60">{ing.unit === 'bag' ? 'กระสอบ' : 'KG'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right align-top bg-emerald-50/30 dark:bg-emerald-500/5">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                          {res.weight.toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </span>
                      </td>
                      <td className="p-4 text-right align-top bg-rose-50/30 dark:bg-rose-500/5">
                        <span className="font-black text-rose-600 dark:text-rose-400 text-lg">
                          {res.cost.toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </span>
                      </td>
                      <td className="p-4 align-middle no-print">
                         <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(ing)} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors" title="แก้ไข">
                               <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDelete(ing.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors" title="ลบ">
                               <Trash2 className="w-5 h-5" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-white/10">
                <tr className="bg-slate-50 dark:bg-white/5">
                   <td colSpan={5} className="p-4 text-right font-bold text-slate-700 dark:text-white/80 text-sm uppercase tracking-wider">
                     รวมทั้งหมด (Total):
                   </td>
                   <td className="p-4 text-right bg-emerald-50/50 dark:bg-emerald-500/10">
                     <div className="flex flex-col items-end">
                       <span className="text-emerald-600 dark:text-emerald-400 text-xl font-black">{summary.totalWeight.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                       <span className="text-[10px] font-bold text-emerald-600/50 uppercase">KG</span>
                     </div>
                   </td>
                   <td className="p-4 text-right bg-rose-50/50 dark:bg-rose-500/10">
                     <div className="flex flex-col items-end">
                       <span className="text-rose-600 dark:text-rose-400 text-xl font-black">{summary.totalCost.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                       <span className="text-[10px] font-bold text-rose-600/50 uppercase">BAHT</span>
                     </div>
                   </td>
                   <td className="bg-slate-50 dark:bg-white/5 no-print"></td>
                </tr>
                <tr className="border-t-2 border-slate-200 dark:border-white/10 bg-blue-50 dark:bg-blue-900/10">
                   <td colSpan={5} className="p-5 text-right font-bold text-blue-800 dark:text-blue-300 text-sm uppercase tracking-wider">
                     ผลลัพธ์ต้นทุนเฉลี่ย / กิโลกรัม:
                   </td>
                   <td colSpan={3} className="p-5 text-left border-l-2 border-slate-200 dark:border-white/10">
                     <div className="flex items-end gap-2">
                       <span className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-400 leading-none">{summary.avgCostPerKg.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                       <span className="font-bold text-sm text-blue-700/60 uppercase mb-1">฿ / KG</span>
                     </div>
                   </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      </div>
      {/* Hidden area strictly formatted for PDF generation */}
      <div id="feed-print-container" className="fixed inset-0 z-[9999] bg-white text-black p-10 overflow-auto print-only">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #feed-print-container, #feed-print-container * { visibility: visible; }
              #feed-print-container { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
                margin: 0;
                padding: 40px;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            @media screen {
              .print-only { display: none; }
            }
          `}</style>

          <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '32px' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>นิพนธ์ฟาร์ม</h1>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', margin: '0' }}>FEED COST MATRIX V1.0</p>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>รายงานสรุปวิเคราะห์ต้นทุนอาหารสัตว์</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>Farm / Org:</span>
                      <span style={{ borderBottom: '1px solid #000', width: '160px', display: 'inline-block' }}></span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>Recipe Name:</span>
                      <span style={{ backgroundColor: '#e2e8f0', padding: '4px 12px', fontWeight: 'bold' }}>{recipeName || 'ไม่ระบุชื่อสูตร'}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontWeight: 'bold' }}>Print Date:</span>
                      <span>{new Date().toLocaleString('th-TH')}</span>
                   </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
                 <div style={{ flex: '1', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px 0' }}>TOTAL WEIGHT / น้ำหนักรวม</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', margin: '0' }}>{summary.totalWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style={{ fontSize: '16px', color: '#94a3b8' }}>KG.</span></p>
                 </div>
                 <div style={{ flex: '1', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px 0' }}>TOTAL COST / ต้นทุนรวม</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', margin: '0' }}>{summary.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style={{ fontSize: '16px', color: '#94a3b8' }}>฿</span></p>
                 </div>
                 <div style={{ flex: '1', backgroundColor: '#000000', color: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px 0' }}>AVG COST / ต้นทุนเฉลี่ยต่อ กก.</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', color: '#b4ff00', margin: '0' }}>{summary.avgCostPerKg.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style={{ fontSize: '16px', color: '#94a3b8' }}>฿/KG.</span></p>
                 </div>
              </div>

              {/* Table Section */}
              <div style={{ marginBottom: '40px' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>INGREDIENTS DETAILS / รายละเอียดวัตถุดิบ</h2>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                       <tr style={{ backgroundColor: '#1a1c23', color: '#ffffff' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', width: '40px' }}>#</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Item / รายการ</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }}>Category</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }}>Usage</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', width: '100px' }}>Weight (KG)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', width: '120px' }}>Cost (฿)</th>
                       </tr>
                    </thead>
                    <tbody>
                       {ingredients.map((ing, idx) => {
                          const res = calculateItem(ing);
                          return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                             <td style={{ padding: '12px 16px', color: '#64748b' }}>{idx + 1}</td>
                             <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{ing.name}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>{ing.category}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{ing.amountUsed} {ing.unit}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{res.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                             <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{res.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                       )})}
                    </tbody>
                 </table>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ width: '45%' }}>
                     <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '16px' }}>COST BREAKDOWN / สัดส่วนหมวดหมู่</h3>
                     <div>
                        {(() => {
                           const costByCategory: Record<string, number> = {};
                           ingredients.forEach(ing => {
                              const cost = calculateItem(ing).cost;
                              costByCategory[ing.category] = (costByCategory[ing.category] || 0) + cost;
                           });
                           return Object.entries(costByCategory).map(([cat, cost]) => (
                              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   <div style={{ width: '12px', height: '12px', backgroundColor: '#000000', borderRadius: '50%' }}></div>
                                   <span style={{ fontWeight: 'bold' }}>{cat}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                   <span style={{ color: '#64748b' }}>{cost.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿</span>
                                   <span style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '2px 8px', minWidth: '60px', textAlign: 'right' }}>{((cost / summary.totalCost) * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                           ));
                        })()}
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '250px' }}>
                     <div style={{ borderTop: '1px solid #000000', paddingTop: '16px', textAlign: 'center' }}>
                         <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', margin: '0 0 8px 0' }}>ผู้คำนวณ / Approved By</p>
                         <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0' }}>วันที่ ______/______/______</p>
                     </div>
                  </div>
              </div>

              <div style={{ marginTop: '80px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '2px' }}>
                 GENERATED BY FEED COST MATRIX SYSTEM © {new Date().getFullYear()}
              </div>
          </div>
      </div>
      
      <div className="flex justify-end mt-4">
        {ingredients.length > 0 && (
          <button 
            onClick={handleExportPDF}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl transition-colors font-bold shadow-lg disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            พิมพ์รายงาน / บันทึกเป็น PDF
          </button>
        )}
      </div>
      </div>
      )}

      {/* History Drawer */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/95 backdrop-blur-md">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#0a2e36] w-full max-w-sm h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10"
            >
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500 dark:text-white/60" />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">ประวัติสูตรอาหาร</h3>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {savedRecipes.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                    <p className="text-sm">ยังไม่มีประวัติการบันทึกสูตร</p>
                  </div>
                ) : (
                  savedRecipes.map(recipe => (
                    <div 
                      key={recipe.id}
                      onClick={() => handleLoadRecipe(recipe)}
                      className="p-4 bg-slate-50 dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-pink-500/10 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer transition-colors group"
                    >
                      <h4 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {recipe.recipeName || 'ไม่ระบุชื่อสูตร'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-white/50 mb-2">
                        {new Date(recipe.updatedAt).toLocaleString('th-TH')}
                      </p>
                      <div className="flex gap-4 text-xs font-medium">
                        <span className="text-emerald-600 dark:text-emerald-400">นน. {recipe.totalWeight?.toLocaleString() || 0} KG</span>
                        <span className="text-rose-600 dark:text-rose-400">ทุน {recipe.totalCost?.toLocaleString() || 0} ฿</span>
                        <span className="text-blue-600 dark:text-blue-400">{(recipe.avgCostPerKg || 0).toFixed(2)} ฿/KG</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-50 dark:bg-[#0f4c5c] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-white/20 flex flex-col max-h-[90vh]"
            >
               <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 shrink-0">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">
                   {editingId ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-600 dark:text-white/50 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                   <X className="w-6 h-6" />
                 </button>
               </div>
               
               <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                 <form id="ingredientForm" onSubmit={handleSaveIngredient} className="space-y-4">
                   
                   {/* Category */}
                   <div>
                     <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">หมวดหมู่วัตถุดิบ</label>
                     {!isAddingCustomCategory ? (
                       <select 
                         value={formCategory}
                         onChange={(e) => {
                           if (e.target.value === 'ADD_NEW') {
                              setIsAddingCustomCategory(true);
                              setFormCategory('');
                              setNewCategoryName('');
                           } else {
                              setFormCategory(e.target.value);
                           }
                         }}
                         className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                       >
                         {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                         <option value="ADD_NEW" className="font-bold text-pink-500">+ เพิ่มหมวดหมู่ใหม่</option>
                       </select>
                     ) : (
                       <div className="flex gap-2">
                         <input 
                           type="text" 
                           placeholder="พิมพ์หมวดหมู่ใหม่..."
                           value={newCategoryName}
                           onChange={e => setNewCategoryName(e.target.value)}
                           className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 flex-1"
                           autoFocus
                           required
                         />
                         <button 
                           type="button" 
                           onClick={() => {
                             setIsAddingCustomCategory(false);
                             setFormCategory('วัตถุดิบหลัก');
                           }}
                           className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white rounded-2xl font-medium"
                         >
                           ยกเลิก
                         </button>
                       </div>
                     )}
                   </div>

                   {/* Name */}
                   <div>
                     <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ชื่อวัตถุดิบ</label>
                     <input 
                       type="text" 
                       list="knownIngredients"
                       value={formName}
                       onChange={e => setFormName(e.target.value)}
                       placeholder="เช่น รำละเอียด, ข้าวโพดบด"
                       required
                       className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                     />
                     <datalist id="knownIngredients">
                       {knownNames.map(name => <option key={name} value={name} />)}
                     </datalist>
                   </div>

                   {/* Weight and Price per pack */}
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1 text-center sm:text-left">น้ำหนัก/บรรจุภัณฑ์ (KG)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         min="0"
                         value={formWeight}
                         onChange={e => setFormWeight(e.target.value)}
                         placeholder="0"
                         required
                         className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder:text-slate-400"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1 text-center sm:text-left">ราคา/บรรจุภัณฑ์ (฿)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         min="0"
                         value={formPrice}
                         onChange={e => setFormPrice(e.target.value)}
                         placeholder="0"
                         required
                         className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder:text-slate-400"
                       />
                     </div>
                   </div>

                   {/* Amount Used and Unit Toggle */}
                   <div className="pt-2">
                     <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-3 ml-1">ปริมาณที่ต้องการใช้ผสม</label>
                     
                     <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10">
                       <input 
                         type="number" 
                         step="0.01"
                         min="0"
                         value={formAmount}
                         onChange={e => setFormAmount(e.target.value)}
                         placeholder="ระบุปริมาณ"
                         required
                         className="flex-1 p-3 bg-transparent text-slate-900 dark:text-white focus:outline-none text-lg font-bold w-full"
                       />
                       
                       <div className="flex bg-slate-200 dark:bg-white/10 rounded-xl p-1 shrink-0">
                         <button 
                           type="button"
                           onClick={() => setFormUnit('bag')}
                           className={clsx(
                             "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                             formUnit === 'bag' 
                               ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                               : "text-slate-500 dark:text-white/50"
                           )}
                         >
                           กระสอบ
                         </button>
                         <button 
                           type="button"
                           onClick={() => setFormUnit('kg')}
                           className={clsx(
                             "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                             formUnit === 'kg' 
                               ? "bg-emerald-500 text-white shadow-sm"
                               : "text-slate-500 dark:text-white/50"
                           )}
                         >
                           กิโลกรัม
                         </button>
                       </div>
                     </div>
                   </div>

                 </form>
               </div>
               
               <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 shrink-0">
                 <button 
                   type="submit" 
                   form="ingredientForm"
                   className="w-full flex items-center justify-center gap-2 p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-pink-500/30"
                 >
                   <CheckCircle2 className="w-6 h-6" />
                   {editingId ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มวัตถุดิบ'}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}

