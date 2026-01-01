import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Pencil, Save, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { libraryService } from '../services/libraryService';
import { emitCategoriesUpdated } from '../utils/categoriesEvents';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ProductCategory = { id: number; name: string };
type ItemCategory = { id: number; name: string; productCategoryId: number };
type SubCategory = { id: number; name: string; itemCategoryId: number };

type Tag = {
  id?: number;
  name: string;
  originalName?: string;
  isNew?: boolean;
  isDeleted?: boolean;
};

function normalizeName(s: string) {
  return sanitizeCategoryInput(s).trim().replace(/\s+/g, ' ');
}

function sanitizeCategoryInput(input: string): string {
  // Only allow A-Z, 0-9, and space. Limit to 25 chars INCLUDING spaces.
  const upper = (input ?? '').toUpperCase();
  const cleaned = upper.replace(/[^A-Z0-9 ]/g, '');
  return cleaned.slice(0, 25);
}

function splitNames(input: string) {
  return input
    .split(',')
    .map((p) => normalizeName(p))
    .filter(Boolean);
}

function makeToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function TagPill({
  tag,
  editable,
  onChange,
  onRemove,
}: {
  tag: Tag;
  editable: boolean;
  onChange: (next: string) => void;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm">
      {editable ? (
        <input
          value={tag.name}
          onChange={(e) => onChange(sanitizeCategoryInput(e.target.value))}
          className="bg-transparent outline-none w-44"
        />
      ) : (
        <span className="max-w-[220px] truncate">{tag.name}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-500 hover:text-gray-900"
        aria-label="Remove"
        title="Remove"
      >
        <X className="w-4 h-4" />
      </button>
    </span>
  );
}

function SelectableTag({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm border transition-colors ${
        selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {selected && <Check className="w-4 h-4" />}
      {label}
    </button>
  );
}

export default function AddManageCategoriesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, 'id'>) => {
    const id = makeToastId();
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  };

  // Product category
  const [loading, setLoading] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductCategory | null>(null);
  const [productSelected, setProductSelected] = useState<Tag[]>([]);
  const [productDraft, setProductDraft] = useState('');
  const [productEditMode, setProductEditMode] = useState(false);
  const [productSnapshot, setProductSnapshot] = useState<Tag[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Item categories - per product category
  const [itemAll, setItemAll] = useState<ItemCategory[]>([]);
  const [itemsByProduct, setItemsByProduct] = useState<Record<number, Tag[]>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<number, string>>({});
  const [itemEditModes, setItemEditModes] = useState<Record<number, boolean>>({});
  const [itemSnapshots, setItemSnapshots] = useState<Record<number, Tag[]>>({});

  // Sub categories - per product+item combination
  const [subAll, setSubAll] = useState<SubCategory[]>([]);
  const [subsByProductItem, setSubsByProductItem] = useState<Record<string, Tag[]>>({});
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});
  const [subEditModes, setSubEditModes] = useState<Record<string, boolean>>({});
  const [subSnapshots, setSubSnapshots] = useState<Record<string, Tag[]>>({});

  // Helper: Get items for a specific product category
  const getItemsForProduct = (productId: number) => {
    return itemAll.filter((i) => i.productCategoryId === productId);
  };

  // Helper: Get selected products (not deleted)
  const getSelectedProducts = () => {
    return productSelected.filter((t) => !t.isDeleted);
  };

  const productInputRef = useRef<HTMLInputElement>(null);
  const pendingNavStateRef = useRef<any>((location as any).state || null);
  const wizardContainerRef = useRef<HTMLDivElement>(null);
  
  // Autocomplete dropdown states
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showItemSuggestions, setShowItemSuggestions] = useState<Record<number, boolean>>({});
  const [showSubSuggestions, setShowSubSuggestions] = useState<Record<string, boolean>>({});

  const loadProducts = async () => {
    const res = await libraryService.getYourProductCategories();
    setProductCategories(res.data || []);
  };

  const loadItems = async (productCategoryId: number) => {
    const res = await libraryService.getYourItemCategories(productCategoryId);
    const newItems = res.data || [];
    setItemAll((prev) => {
      // Remove existing items for this product category, then add new ones
      const filtered = prev.filter((i) => i.productCategoryId !== productCategoryId);
      return [...filtered, ...newItems];
    });
  };

  const loadSubs = async (itemCategoryId: number) => {
    const res = await libraryService.getYourSubCategories(itemCategoryId);
    const newSubs = res.data || [];
    setSubAll((prev) => {
      // Remove existing subs for this item category, then add new ones
      const filtered = prev.filter((s) => s.itemCategoryId !== itemCategoryId);
      return [...filtered, ...newSubs];
    });
  };

  useEffect(() => {
    setLoading(true);
    loadProducts()
      .catch((e) => {
        console.error(e);
        pushToast({ type: 'error', title: 'Failed to load product categories' });
      })
      .finally(() => setLoading(false));
  }, []);

  // If we arrived from Category Master "Edit", preselect the relevant hierarchy.
  useEffect(() => {
    const st = pendingNavStateRef.current;
    if (!st?.fromCategoryMaster) return;
    if (!productCategories.length) return;

    const pcId = Number(st.productCategoryId) || null;
    const icId = Number(st.itemCategoryId) || null;

    if (pcId) {
      const pc = productCategories.find((p) => p.id === pcId);
      if (pc) {
        setSelectedProduct(pc);
        setStep(2);
      }
    }

    if (icId) {
      setStep(3);
    }

    // Consume once
    pendingNavStateRef.current = null;
  }, [productCategories]);

  // Load items for all selected products when step changes to 2
  useEffect(() => {
    if (step !== 2) return;
    const selectedProducts = getSelectedProducts();
    if (selectedProducts.length === 0) return;
    
    setLoading(true);
    Promise.all(
      selectedProducts
        .filter((t) => t.id)
        .map((t) => loadItems(t.id as number))
    )
      .catch((e) => {
        console.error(e);
        pushToast({ type: 'error', title: 'Failed to load item categories' });
      })
      .finally(() => setLoading(false));
  }, [step, productSelected]);

  // Load subs for all saved items when step changes to 3
  useEffect(() => {
    if (step !== 3) return;
    const selectedProducts = getSelectedProducts();
    const itemIds: number[] = [];
    
    for (const productTag of selectedProducts) {
      if (productTag.id) {
        const items = getItemsForProduct(productTag.id);
        itemIds.push(...items.map((i) => i.id));
      }
    }
    
    if (itemIds.length === 0) return;
    
    setLoading(true);
    Promise.all(itemIds.map((id) => loadSubs(id)))
      .catch((e) => {
        console.error(e);
        pushToast({ type: 'error', title: 'Failed to load sub-categories' });
      })
      .finally(() => setLoading(false));
  }, [step, itemAll]);

  const selectProduct = (p: ProductCategory) => {
    setSelectedProduct(p);
  };

  const toggleSelectExistingProduct = (p: ProductCategory) => {
    setProductSelected((prev) => {
      const exists = prev.find((t) => t.id === p.id);
      if (exists) {
        // stage remove
        const updated = prev.map((t) => (t.id === p.id ? { ...t, isDeleted: !t.isDeleted } : t));
        // If we're removing the currently selected product, select another one
        if (selectedProduct?.id === p.id && !exists.isDeleted) {
          const remaining = updated.filter((t) => !t.isDeleted && t.id);
          if (remaining.length > 0 && remaining[0].id) {
            const found = productCategories.find((pc) => pc.id === remaining[0].id);
            if (found) selectProduct(found);
          } else {
            setSelectedProduct(null);
          }
        }
        return updated;
      }
      const newList = [...prev, { id: p.id, name: p.name, originalName: p.name }];
      // Auto-select first product if none selected
      if (!selectedProduct) {
        selectProduct(p);
      }
      return newList;
    });
  };

  const addProductsFromDraft = () => {
    const names = splitNames(productDraft);
    if (names.length === 0) return;

    setProductSelected((prev) => {
      const next = [...prev];
      for (const name of names) {
        const alreadySelected = next.some((t) => !t.isDeleted && t.name.toLowerCase() === name.toLowerCase());
        if (alreadySelected) continue;

        const existing = productCategories.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          next.push({ id: existing.id, name: existing.name, originalName: existing.name });
          // Auto-select first product if none selected
          if (!selectedProduct) {
            selectProduct(existing);
          }
        } else {
          next.push({ name, isNew: true });
        }
      }
      return next;
    });

    setProductDraft('');
  };

  const startProductEdit = () => {
    setProductSnapshot(JSON.parse(JSON.stringify(productSelected)));
    setProductEditMode(true);
  };

  const cancelProductEdit = () => {
    setProductSelected(productSnapshot);
    setProductEditMode(false);
  };

  const saveProducts = async (): Promise<Tag[] | undefined> => {
    // validation: empty/duplicates
    const names = productSelected.filter((t) => !t.isDeleted).map((t) => normalizeName(t.name));
    if (names.some((n) => !n)) {
      pushToast({ type: 'error', title: 'Product category name cannot be empty' });
      return undefined;
    }
    const dup = names.find((n, idx) => names.findIndex((x) => x.toLowerCase() === n.toLowerCase()) !== idx);
    if (dup) {
      pushToast({ type: 'error', title: `Duplicate product category: "${dup}"` });
      return undefined;
    }

    setLoading(true);
    try {
      // creates
      for (const t of productSelected.filter((x) => !x.isDeleted && x.isNew)) {
        await libraryService.createYourProductCategory({ name: normalizeName(t.name) });
      }
      // updates (rename)
      for (const t of productSelected.filter((x) => !x.isDeleted && x.id && x.originalName && normalizeName(x.name) !== normalizeName(x.originalName))) {
        await libraryService.updateYourProductCategory(t.id as number, {
          name: normalizeName(t.name),
        });
      }

      await loadProducts();
      
      // Update productSelected with saved IDs
      const updatedProductCategories = await libraryService.getYourProductCategories();
      const freshProductCategories = updatedProductCategories.data || [];
      const updatedProductSelected: Tag[] = productSelected.map((t) => {
        if (t.isDeleted) return t;
        if (t.isNew) {
          // Find the newly created product by name
          const found = freshProductCategories.find((p: ProductCategory) => p.name.toLowerCase() === normalizeName(t.name).toLowerCase());
          if (found) {
            return { id: found.id, name: found.name, originalName: found.name };
          }
        }
        return t;
      });
      setProductSelected(updatedProductSelected);
      
      setProductEditMode(false);
      pushToast({ type: 'success', title: 'Product categories saved' });
      emitCategoriesUpdated();
      
      return updatedProductSelected;
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Failed to save product categories', message: e?.message });
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const goNextFromProduct = async () => {
    const updatedProductSelected = await saveProducts();
    if (!updatedProductSelected) return; // saveProducts failed
    
    const selectedProducts = updatedProductSelected.filter((t: Tag) => !t.isDeleted && t.id);
    if (selectedProducts.length > 0) {
      // Refresh items for all selected products before moving to step 2
      setLoading(true);
      try {
        await Promise.all(
          selectedProducts
            .map((t) => loadItems(t.id as number))
        );
      } catch (e) {
        console.error('Error loading items:', e);
        pushToast({ type: 'error', title: 'Failed to load item categories' });
      } finally {
        setLoading(false);
      }
      
      setStep(2);
      // Scroll to next step horizontally (wizard style)
      setTimeout(() => {
        if (wizardContainerRef.current) {
          wizardContainerRef.current.scrollTo({
            left: wizardContainerRef.current.clientWidth,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const goNextFromItem = async () => {
    // Save all items first
    await saveAllItems();
    
    // Refresh items and load sub-categories for all items before moving to step 3
    const selectedProducts = getSelectedProducts();
    setLoading(true);
    try {
      // Reload items for all products (loadItems now merges properly)
      await Promise.all(
        selectedProducts
          .filter((t) => t.id)
          .map((t) => loadItems(t.id as number))
      );
      
      // Get all item IDs from the merged itemAll
      const itemIds: number[] = [];
      for (const productTag of selectedProducts) {
        if (productTag.id) {
          const items = getItemsForProduct(productTag.id);
          itemIds.push(...items.map((i) => i.id));
        }
      }
      
      // Load sub-categories for all items
      if (itemIds.length > 0) {
        await Promise.all(itemIds.map((id) => loadSubs(id)));
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
    
    setStep(3);
    // Scroll to next step horizontally (wizard style)
    setTimeout(() => {
      if (wizardContainerRef.current) {
        wizardContainerRef.current.scrollTo({
          left: wizardContainerRef.current.clientWidth * 2,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Item category functions - per product
  const addItemsFromDraft = (productId: number) => {
    const names = splitNames(itemDrafts[productId] || '');
    if (names.length === 0) return;

    const itemsForProduct = getItemsForProduct(productId);
    setItemsByProduct((prev) => {
      const current = prev[productId] || [];
      const next = [...current];
      for (const name of names) {
        const alreadySelected = next.some((t) => !t.isDeleted && t.name.toLowerCase() === name.toLowerCase());
        if (alreadySelected) continue;

        const existing = itemsForProduct.find((i) => i.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          next.push({ id: existing.id, name: existing.name, originalName: existing.name });
        } else {
          next.push({ name, isNew: true });
        }
      }
      return { ...prev, [productId]: next };
    });

    setItemDrafts((prev) => ({ ...prev, [productId]: '' }));
  };

  const toggleSelectExistingItem = (item: ItemCategory, productId: number) => {
    setItemsByProduct((prev) => {
      const current = prev[productId] || [];
      const exists = current.find((t) => t.id === item.id);
      if (exists) {
        return { ...prev, [productId]: current.map((t) => (t.id === item.id ? { ...t, isDeleted: !t.isDeleted } : t)) };
      }
      return { ...prev, [productId]: [...current, { id: item.id, name: item.name, originalName: item.name }] };
    });
  };

  const startItemEdit = (productId: number) => {
    setItemSnapshots((prev) => ({
      ...prev,
      [productId]: JSON.parse(JSON.stringify(itemsByProduct[productId] || []))
    }));
    setItemEditModes((prev) => ({ ...prev, [productId]: true }));
  };

  const cancelItemEdit = (productId: number) => {
    setItemsByProduct((prev) => ({
      ...prev,
      [productId]: itemSnapshots[productId] || []
    }));
    setItemEditModes((prev) => ({ ...prev, [productId]: false }));
  };

  const saveItemsForProduct = async (productId: number) => {
    const itemSelected = itemsByProduct[productId] || [];
    const names = itemSelected.filter((t) => !t.isDeleted).map((t) => normalizeName(t.name));
    if (names.some((n) => !n)) {
      pushToast({ type: 'error', title: 'Item category name cannot be empty' });
      return;
    }
    const dup = names.find((n, idx) => names.findIndex((x) => x.toLowerCase() === n.toLowerCase()) !== idx);
    if (dup) {
      pushToast({ type: 'error', title: `Duplicate item category: "${dup}"` });
      return;
    }

    setLoading(true);
    try {
      // deletes
      for (const t of itemSelected.filter((x) => x.isDeleted && x.id)) {
        await libraryService.deleteYourItemCategory(t.id as number);
      }
      // creates
      for (const t of itemSelected.filter((x) => !x.isDeleted && x.isNew)) {
        await libraryService.createYourItemCategory({ name: normalizeName(t.name), productCategoryId: productId });
      }
      // updates (rename)
      for (const t of itemSelected.filter((x) => !x.isDeleted && x.id && x.originalName && normalizeName(x.name) !== normalizeName(x.originalName))) {
        await libraryService.updateYourItemCategory(t.id as number, {
          name: normalizeName(t.name),
          productCategoryId: productId,
        });
      }

      await loadItems(productId);
      setItemsByProduct((prev) => ({ ...prev, [productId]: [] }));
      setItemEditModes((prev) => ({ ...prev, [productId]: false }));
      pushToast({ type: 'success', title: 'Item categories saved' });
      emitCategoriesUpdated();
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Failed to save item categories', message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteItemCategory = async (productId: number, itemTag: Tag, itemIdx: number) => {
    if (itemTag.id) {
      // If it has an ID, delete it from backend immediately
      setLoading(true);
      try {
        await libraryService.deleteYourItemCategory(itemTag.id);
        await loadItems(productId);
        // Remove from local state
        setItemsByProduct((prev) => ({
          ...prev,
          [productId]: (prev[productId] || []).filter((_, i) => i !== itemIdx)
        }));
        pushToast({ type: 'success', title: 'Item category deleted' });
        emitCategoriesUpdated();
      } catch (e: any) {
        pushToast({ type: 'error', title: 'Failed to delete item category', message: e?.message });
      } finally {
        setLoading(false);
      }
    } else {
      // If it's new (no ID), just remove from state
      setItemsByProduct((prev) => ({
        ...prev,
        [productId]: (prev[productId] || []).filter((_, i) => i !== itemIdx)
      }));
    }
  };

  const saveAllItems = async () => {
    const selectedProducts = getSelectedProducts();
    for (const productTag of selectedProducts) {
      if (productTag.id && itemsByProduct[productTag.id]?.length > 0) {
        await saveItemsForProduct(productTag.id);
      }
    }
  };

  // Sub category functions - per product+item combination
  const getSubsForItem = (itemId: number) => {
    return subAll.filter((s) => s.itemCategoryId === itemId);
  };

  const getKey = (productId: number, itemId: number) => {
    return `${productId}-${itemId}`;
  };

  const addSubsFromDraft = (productId: number, itemId: number) => {
    const key = getKey(productId, itemId);
    const names = splitNames(subDrafts[key] || '');
    if (names.length === 0) return;

    const subsForItem = getSubsForItem(itemId);
    setSubsByProductItem((prev) => {
      const current = prev[key] || [];
      const next = [...current];
      for (const name of names) {
        const alreadySelected = next.some((t) => !t.isDeleted && t.name.toLowerCase() === name.toLowerCase());
        if (alreadySelected) continue;

        const existing = subsForItem.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          next.push({ id: existing.id, name: existing.name, originalName: existing.name });
        } else {
          next.push({ name, isNew: true });
        }
      }
      return { ...prev, [key]: next };
    });

    setSubDrafts((prev) => ({ ...prev, [key]: '' }));
  };

  const toggleSelectExistingSub = (sub: SubCategory, productId: number, itemId: number) => {
    const key = getKey(productId, itemId);
    setSubsByProductItem((prev) => {
      const current = prev[key] || [];
      const exists = current.find((t) => t.id === sub.id);
      if (exists) {
        return { ...prev, [key]: current.map((t) => (t.id === sub.id ? { ...t, isDeleted: !t.isDeleted } : t)) };
      }
      return { ...prev, [key]: [...current, { id: sub.id, name: sub.name, originalName: sub.name }] };
    });
  };

  const startSubEdit = (productId: number, itemId: number) => {
    const key = getKey(productId, itemId);
    setSubSnapshots((prev) => ({
      ...prev,
      [key]: JSON.parse(JSON.stringify(subsByProductItem[key] || []))
    }));
    setSubEditModes((prev) => ({ ...prev, [key]: true }));
  };

  const cancelSubEdit = (productId: number, itemId: number) => {
    const key = getKey(productId, itemId);
    setSubsByProductItem((prev) => ({
      ...prev,
      [key]: subSnapshots[key] || []
    }));
    setSubEditModes((prev) => ({ ...prev, [key]: false }));
  };

  const saveSubsForItem = async (productId: number, itemId: number) => {
    const key = getKey(productId, itemId);
    const subSelected = subsByProductItem[key] || [];
    const names = subSelected.filter((t) => !t.isDeleted).map((t) => normalizeName(t.name));
    if (names.some((n) => !n)) {
      pushToast({ type: 'error', title: 'Sub-category name cannot be empty' });
      return;
    }
    const dup = names.find((n, idx) => names.findIndex((x) => x.toLowerCase() === n.toLowerCase()) !== idx);
    if (dup) {
      pushToast({ type: 'error', title: `Duplicate sub-category: "${dup}"` });
      return;
    }

    setLoading(true);
    try {
      for (const t of subSelected.filter((x) => x.isDeleted && x.id)) {
        await libraryService.deleteYourSubCategory(t.id as number);
      }
      for (const t of subSelected.filter((x) => !x.isDeleted && x.isNew)) {
        await libraryService.createYourSubCategory({ name: normalizeName(t.name), itemCategoryId: itemId });
      }
      for (const t of subSelected.filter((x) => !x.isDeleted && x.id && x.originalName && normalizeName(x.name) !== normalizeName(x.originalName))) {
        await libraryService.updateYourSubCategory(t.id as number, {
          name: normalizeName(t.name),
          itemCategoryId: itemId,
        });
      }

      await loadSubs(itemId);
      setSubsByProductItem((prev) => ({ ...prev, [key]: [] }));
      setSubEditModes((prev) => ({ ...prev, [key]: false }));
      pushToast({ type: 'success', title: 'Sub-categories saved' });
      emitCategoriesUpdated();
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Failed to save sub-categories', message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteSubCategory = async (productId: number, itemId: number, subTag: Tag, subIdx: number) => {
    const key = getKey(productId, itemId);
    if (subTag.id) {
      // If it has an ID, delete it from backend immediately
      setLoading(true);
      try {
        await libraryService.deleteYourSubCategory(subTag.id);
        await loadSubs(itemId);
        // Remove from local state
        setSubsByProductItem((prev) => ({
          ...prev,
          [key]: (prev[key] || []).filter((_, i) => i !== subIdx)
        }));
        pushToast({ type: 'success', title: 'Sub-category deleted' });
        emitCategoriesUpdated();
      } catch (e: any) {
        pushToast({ type: 'error', title: 'Failed to delete sub-category', message: e?.message });
      } finally {
        setLoading(false);
      }
    } else {
      // If it's new (no ID), just remove from state
      setSubsByProductItem((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((_, i) => i !== subIdx)
      }));
    }
  };

  const saveAllAndComplete = async () => {
    const selectedProducts = getSelectedProducts();
    if (selectedProducts.length === 0) {
      pushToast({ type: 'error', title: 'Select at least one Product Category first' });
      return;
    }

    setLoading(true);
    try {
      // 1) Save all item categories for all products
      await saveAllItems();

      // 2) Reload all items for all products
      const freshItemsPromises = selectedProducts
        .filter((t) => t.id)
        .map((t) => libraryService.getYourItemCategories(t.id as number));
      const freshItemsResults = await Promise.all(freshItemsPromises);
      const allFreshItems: ItemCategory[] = [];
      freshItemsResults.forEach((res) => {
        allFreshItems.push(...(res.data || []));
      });
      setItemAll(allFreshItems);

      // 3) Save all sub-categories for all product+item combinations
      for (const productTag of selectedProducts) {
        if (!productTag.id) continue;
        const items = getItemsForProduct(productTag.id);
        for (const item of items) {
          const key = getKey(productTag.id, item.id);
          const subs = subsByProductItem[key] || [];
          if (subs.filter((t) => !t.isDeleted).length > 0 || subs.some((t) => t.isDeleted)) {
            await saveSubsForItem(productTag.id, item.id);
          }
        }
      }

      pushToast({ type: 'success', title: 'All changes saved' });
      emitCategoriesUpdated();
      navigate('/app/library');
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Save All failed', message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    const selectedProducts = getSelectedProducts();
    if (selectedProducts.length === 0) {
      pushToast({ type: 'error', title: 'Select at least one Product Category first' });
      return;
    }

    setLoading(true);
    try {
      // 1) Save all item categories for all products
      await saveAllItems();

      // 2) Reload all items for all products
      const freshItemsPromises = selectedProducts
        .filter((t) => t.id)
        .map((t) => libraryService.getYourItemCategories(t.id as number));
      const freshItemsResults = await Promise.all(freshItemsPromises);
      const allFreshItems: ItemCategory[] = [];
      freshItemsResults.forEach((res) => {
        allFreshItems.push(...(res.data || []));
      });
      setItemAll(allFreshItems);

      // 3) Save all sub-categories for all product+item combinations
      for (const productTag of selectedProducts) {
        if (!productTag.id) continue;
        const items = getItemsForProduct(productTag.id);
        for (const item of items) {
          const key = getKey(productTag.id, item.id);
          const subs = subsByProductItem[key] || [];
          if (subs.filter((t) => !t.isDeleted).length > 0 || subs.some((t) => t.isDeleted)) {
            await saveSubsForItem(productTag.id, item.id);
          }
        }
      }

      pushToast({ type: 'success', title: 'All changes saved' });
      emitCategoriesUpdated();
      navigate('/app/library');
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Save All failed', message: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        .wizard-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-80 rounded-2xl border px-4 py-3 shadow-lg bg-white ${
              t.type === 'success'
                ? 'border-emerald-200'
                : t.type === 'error'
                  ? 'border-rose-200'
                  : 'border-slate-200'
            }`}
          >
            <div className="font-black text-slate-900">{t.title}</div>
            {t.message && <div className="text-sm text-slate-600 mt-0.5 font-medium">{t.message}</div>}
          </div>
        ))}
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/app/library')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Add / Manage Categories</h1>
          </div>
          <div className="text-base text-slate-500 font-medium flex items-center gap-2">
            <span className={step === 1 ? 'font-black text-indigo-600' : ''}>Product Category</span>
              <span>→</span>
            <span className={step === 2 ? 'font-black text-indigo-600' : ''}>Item Category</span>
              <span>→</span>
            <span className={step === 3 ? 'font-black text-indigo-600' : ''}>Sub-Category</span>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Working...
            </div>
          )}
        </div>

        {/* Wizard Container - Horizontal Scrolling */}
        <div 
          ref={wizardContainerRef}
          className="wizard-scroll-container overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="flex" style={{ width: '300%' }}>
            {/* Step 1: Product Category */}
            <div className="flex-shrink-0 w-full snap-center" style={{ width: '33.333%' }}>
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 mr-4">
                <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">1) Product Category</div>
              <div className="text-xs text-gray-500 mt-1">Type and press Enter (or use commas) to add. Suggestions will appear as you type.</div>
            </div>
            {productSelected.filter((t) => !t.isDeleted).length > 0 && (
              <div className="text-xs text-gray-500">
                Selected: <span className="font-semibold text-gray-900">
                  {productSelected.filter((t) => !t.isDeleted).map((t) => t.name).join(', ')}
                </span>
              </div>
            )}
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-600">Product Category</label>
                  <div className="mt-1 relative autocomplete-container">
                    <div className="border border-gray-300 rounded-lg px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {productSelected
                          .filter((t) => !t.isDeleted)
                          .map((t, idx) => (
                            <TagPill
                              key={`${t.id ?? 'new'}-${idx}`}
                              tag={t}
                              editable={productEditMode}
                              onChange={(next) =>
                                setProductSelected((prev) => prev.map((x, i) => (i === idx ? { ...x, name: next } : x)))
                              }
                              onRemove={() => setProductSelected((prev) => prev.map((x, i) => (i === idx ? { ...x, isDeleted: true } : x)))}
                            />
                          ))}
                        <input
                          ref={productInputRef}
                          value={productDraft}
                          onChange={(e) => {
                            setProductDraft(sanitizeCategoryInput(e.target.value));
                            setShowProductSuggestions(e.target.value.length > 0);
                          }}
                          onFocus={() => {
                            if (productDraft.length > 0) {
                              setShowProductSuggestions(true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addProductsFromDraft();
                              setShowProductSuggestions(false);
                            }
                            if (e.key === 'Backspace' && productDraft === '' && productSelected.length > 0) {
                              // remove last
                              const lastIdx = productSelected
                                .map((t, i) => ({ t, i }))
                                .filter(({ t }) => !t.isDeleted)
                                .slice(-1)[0]?.i;
                              if (lastIdx !== undefined) {
                                setProductSelected((prev) => prev.map((x, i) => (i === lastIdx ? { ...x, isDeleted: true } : x)));
                              }
                            }
                            if (e.key === 'Escape') {
                              setShowProductSuggestions(false);
                            }
                          }}
                          placeholder="Type product category and press Enter…"
                          className="flex-1 min-w-[220px] outline-none"
                        />
                      </div>
                    </div>
                    
                    {/* Autocomplete suggestions */}
                    {showProductSuggestions && productDraft.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {productCategories
                          .filter((p) => {
                            const searchTerm = productDraft.toLowerCase();
                            return p.name.toLowerCase().includes(searchTerm) && 
                                   !productSelected.some((t) => t.id === p.id && !t.isDeleted);
                          })
                          .slice(0, 10)
                          .map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                toggleSelectExistingProduct(p);
                                setProductDraft('');
                                setShowProductSuggestions(false);
                              }}
                              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{p.name}</div>
                            </div>
                          ))}
                        {productCategories.filter((p) => {
                          const searchTerm = productDraft.toLowerCase();
                          return p.name.toLowerCase().includes(searchTerm) && 
                                 !productSelected.some((t) => t.id === p.id && !t.isDeleted);
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">No matching categories found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => (productEditMode ? cancelProductEdit() : startProductEdit())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
            >
              <Pencil className="w-4 h-4" />
              {productEditMode ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={goNextFromProduct}
              disabled={productSelected.filter((t) => !t.isDeleted).length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
                      Save & Next
                    </button>
                </div>
              </div>
            </div>

            {/* Step 2: Item Category */}
            <div className="flex-shrink-0 w-full snap-center" style={{ width: '33.333%' }}>
              <div className="space-y-4 mr-4">
                {getSelectedProducts().map((productTag) => {
                  const productId = productTag.id;
                  if (!productId) return null;
                  
                  const itemsForProduct = getItemsForProduct(productId);
                  const itemSelected = itemsByProduct[productId] || [];
                  const itemDraft = itemDrafts[productId] || '';
                  const itemEditMode = itemEditModes[productId] || false;
                  
                  return (
                    <div key={productId} className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700">Product Category: {productTag.name}</div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-semibold text-gray-900 mb-2">Add Item Category</div>
                        <div className="relative autocomplete-container">
                          <div className="border border-gray-300 rounded-lg px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {itemSelected
                                .filter((t) => !t.isDeleted)
                                .map((t, idx) => (
                                  <TagPill
                                    key={`${t.id ?? 'new'}-${idx}`}
                                    tag={t}
                                    editable={itemEditMode}
                                    onChange={(next) =>
                                      setItemsByProduct((prev) => ({
                                        ...prev,
                                        [productId]: (prev[productId] || []).map((x, i) => (i === idx ? { ...x, name: next } : x))
                                      }))
                                    }
                                    onRemove={() => deleteItemCategory(productId, t, idx)}
                                  />
                                ))}
                              <input
                                value={itemDraft}
                                onChange={(e) => {
                                  setItemDrafts((prev) => ({ ...prev, [productId]: sanitizeCategoryInput(e.target.value) }));
                                  setShowItemSuggestions((prev) => ({ ...prev, [productId]: e.target.value.length > 0 }));
                                }}
                                onFocus={() => {
                                  if (itemDraft.length > 0) {
                                    setShowItemSuggestions((prev) => ({ ...prev, [productId]: true }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    addItemsFromDraft(productId);
                                    setShowItemSuggestions((prev) => ({ ...prev, [productId]: false }));
                                  }
                                  if (e.key === 'Backspace' && itemDraft === '' && itemSelected.length > 0) {
                                    const lastIdx = itemSelected
                                      .map((t, i) => ({ t, i }))
                                      .filter(({ t }) => !t.isDeleted)
                                      .slice(-1)[0]?.i;
                                    if (lastIdx !== undefined) {
                                      deleteItemCategory(productId, itemSelected[lastIdx], lastIdx);
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    setShowItemSuggestions((prev) => ({ ...prev, [productId]: false }));
                                  }
                                }}
                                placeholder="Item category name (Press Enter to add)"
                                className="flex-1 min-w-[220px] outline-none"
                              />
                            </div>
                          </div>
                          
                          {/* Autocomplete suggestions */}
                          {showItemSuggestions[productId] && itemDraft.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {itemsForProduct
                                .filter((i) => {
                                  const searchTerm = itemDraft.toLowerCase();
                                  return i.name.toLowerCase().includes(searchTerm) && 
                                         !itemSelected.some((t) => t.id === i.id && !t.isDeleted);
                                })
                                .slice(0, 10)
                                .map((i) => (
                                  <div
                                    key={i.id}
                                    onClick={() => {
                                      toggleSelectExistingItem(i, productId);
                                      setItemDrafts((prev) => ({ ...prev, [productId]: '' }));
                                      setShowItemSuggestions((prev) => ({ ...prev, [productId]: false }));
                                    }}
                                    className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium">{i.name}</div>
                                  </div>
                                ))}
                              {itemsForProduct.filter((i) => {
                                const searchTerm = itemDraft.toLowerCase();
                                return i.name.toLowerCase().includes(searchTerm) && 
                                       !itemSelected.some((t) => t.id === i.id && !t.isDeleted);
                              }).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No matching categories found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => (itemEditMode ? cancelItemEdit(productId) : startItemEdit(productId))}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                        >
                          {itemEditMode ? 'Cancel' : 'Edit'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {getSelectedProducts().length === 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-5 opacity-60">
                    <div className="text-sm text-gray-500">Select Product Categories in Step 1 first.</div>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={goNextFromItem}
                    disabled={getSelectedProducts().length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save All and Next
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Sub-Category */}
            <div className="flex-shrink-0 w-full snap-center" style={{ width: '33.333%' }}>
              <div className="space-y-4">
                {getSelectedProducts().map((productTag) => {
                  const productId = productTag.id;
                  if (!productId) return null;
                  
                  const itemsForProduct = getItemsForProduct(productId);
                  
                  return itemsForProduct.map((item) => {
                    const key = getKey(productId, item.id);
                    const subSelected = subsByProductItem[key] || [];
                    const subDraft = subDrafts[key] || '';
                    const subEditMode = subEditModes[key] || false;
                    const subsForItem = getSubsForItem(item.id);
                    
                    return (
                      <div key={key} className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="mb-4">
                          <div className="text-sm font-medium text-gray-700 mb-1">Item Category: {item.name}</div>
                          <div className="text-sm font-medium text-gray-700">Product Category: {productTag.name}</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-sm font-semibold text-gray-900 mb-2">Add Sub-Category</div>
                          <div className="relative autocomplete-container">
                            <div className="border border-gray-300 rounded-lg px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {subSelected
                                  .filter((t) => !t.isDeleted)
                                  .map((t, idx) => (
                                    <TagPill
                                      key={`${t.id ?? 'new'}-${idx}`}
                                      tag={t}
                                      editable={subEditMode}
                                      onChange={(next) =>
                                        setSubsByProductItem((prev) => ({
                                          ...prev,
                                          [key]: (prev[key] || []).map((x, i) => (i === idx ? { ...x, name: next } : x))
                                        }))
                                      }
                                      onRemove={() => deleteSubCategory(productId, item.id, t, idx)}
                                    />
                                  ))}
                                <input
                                  value={subDraft}
                                  onChange={(e) => {
                                    setSubDrafts((prev) => ({ ...prev, [key]: sanitizeCategoryInput(e.target.value) }));
                                    setShowSubSuggestions((prev) => ({ ...prev, [key]: e.target.value.length > 0 }));
                                  }}
                                  onFocus={() => {
                                    if (subDraft.length > 0) {
                                      setShowSubSuggestions((prev) => ({ ...prev, [key]: true }));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault();
                                      addSubsFromDraft(productId, item.id);
                                      setShowSubSuggestions((prev) => ({ ...prev, [key]: false }));
                                    }
                                    if (e.key === 'Backspace' && subDraft === '' && subSelected.length > 0) {
                                      const lastIdx = subSelected
                                        .map((t, i) => ({ t, i }))
                                        .filter(({ t }) => !t.isDeleted)
                                        .slice(-1)[0]?.i;
                                      if (lastIdx !== undefined) {
                                        deleteSubCategory(productId, item.id, subSelected[lastIdx], lastIdx);
                                      }
                                    }
                                    if (e.key === 'Escape') {
                                      setShowSubSuggestions((prev) => ({ ...prev, [key]: false }));
                                    }
                                  }}
                                  placeholder="Sub-category name (Press Enter to add)"
                                  className="flex-1 min-w-[220px] outline-none"
                                />
                              </div>
                            </div>
                            
                            {/* Autocomplete suggestions */}
                            {showSubSuggestions[key] && subDraft.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {subsForItem
                                  .filter((s) => {
                                    const searchTerm = subDraft.toLowerCase();
                                    return s.name.toLowerCase().includes(searchTerm) && 
                                           !subSelected.some((t) => t.id === s.id && !t.isDeleted);
                                  })
                                  .slice(0, 10)
                                  .map((s) => (
                                    <div
                                      key={s.id}
                                      onClick={() => {
                                        toggleSelectExistingSub(s, productId, item.id);
                                        setSubDrafts((prev) => ({ ...prev, [key]: '' }));
                                        setShowSubSuggestions((prev) => ({ ...prev, [key]: false }));
                                      }}
                                      className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium">{s.name}</div>
                                    </div>
                                  ))}
                                {subsForItem.filter((s) => {
                                  const searchTerm = subDraft.toLowerCase();
                                  return s.name.toLowerCase().includes(searchTerm) && 
                                         !subSelected.some((t) => t.id === s.id && !t.isDeleted);
                                }).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">No matching categories found</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => (subEditMode ? cancelSubEdit(productId, item.id) : startSubEdit(productId, item.id))}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                          >
                            {subEditMode ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })}
                
                {(() => {
                  const selectedProducts = getSelectedProducts();
                  const hasAnyItems = selectedProducts.some((p) => p.id && getItemsForProduct(p.id).length > 0);
                  
                  if (selectedProducts.length === 0) {
                    return (
                      <div className="bg-white border border-gray-100 rounded-xl p-5 opacity-60">
                        <div className="text-sm text-gray-500">Select Product Categories in Step 1 first.</div>
                      </div>
                    );
                  }
                  
                  if (!hasAnyItems) {
                    return (
                      <div className="bg-white border border-gray-100 rounded-xl p-5 opacity-60">
                        <div className="text-sm text-gray-500">Save item categories in Step 2 first.</div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={saveAllAndComplete}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black"
                      >
                        <Save className="w-4 h-4" />
                        Save All and Next
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}


