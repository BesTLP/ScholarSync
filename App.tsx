
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FacultyMatcher from './components/FacultyMatcher';
import Dashboard from './components/Dashboard';
import ClientArchives from './components/ClientArchives';
import ClientDetail from './components/ClientDetail';
import MyWorks from './components/MyWorks';
import FreeWriteWorkbench from './components/FreeWriteWorkbench';
import EssayAgentEntry from './components/EssayAgentEntry';
import PSWorkbench from './components/PSWorkbench';
import PromptEssayWorkbench from './components/PromptEssayWorkbench';
import CVWorkbench from './components/CVWorkbench';
import LORWorkbench from './components/LORWorkbench';
import AIShieldWorkbench from './components/AIShieldWorkbench';
import CreateClientModal from './components/CreateClientModal';
import FacultyDatabase from './components/FacultyDatabase';
import ChatBot from './components/ChatBot';
import { TabId } from './components/Sidebar';
import { Client, FacultyRecord, FacultyMember } from './types';
import { Construction, MessageCircle, GripHorizontal, Minimize2, Maximize2, X } from 'lucide-react';

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6">
      <Construction size={40} />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">{title} 正在开发中</h2>
    <p className="text-gray-500 max-w-md">
      我们正在全力打造这个功能，旨在为您提供更智能的留学文书服务。敬请期待！
    </p>
  </div>
);

function App() {
  // Initialize state from localStorage or defaults
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      return (localStorage.getItem('scholarsync_activeTab') as TabId) || 'dashboard';
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return 'dashboard';
    }
  });

  const [previousTab, setPreviousTab] = useState<TabId>('users');

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const savedClients = localStorage.getItem('scholarsync_clients');
      return savedClients ? JSON.parse(savedClients) : [
        { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
        { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
      ];
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return [
        { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
        { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
      ];
    }
  });

  const [facultyDatabase, setFacultyDatabase] = useState<FacultyRecord[]>(() => {
    try {
      const savedDB = localStorage.getItem('scholarsync_faculty_db');
      return savedDB ? JSON.parse(savedDB) : [];
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return [];
    }
  });

  const [selectedClient, setSelectedClient] = useState<Client | null>(() => {
    try {
      const savedClientId = localStorage.getItem('scholarsync_selectedClientId');
      if (savedClientId) {
        const savedClientsStr = localStorage.getItem('scholarsync_clients');
        const initialClients = savedClientsStr ? JSON.parse(savedClientsStr) : [
          { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
          { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
        ];
        return initialClients.find((c: Client) => c.id === savedClientId) || null;
      }
    } catch (e) {
      console.error('LocalStorage access failed:', e);
    }
    return null;
  });

  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<{ id: string; content: string; type: string; title: string } | null>(null);
  const [clientDetailInitialTab, setClientDetailInitialTab] = useState<'profile' | 'documents'>('profile');

  // ChatBot State
  const [showChatBot, setShowChatBot] = useState(false);
  const [isChatBotMinimized, setIsChatBotMinimized] = useState(false);
  const [chatBotPosition, setChatBotPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const chatBotRef = React.useRef<HTMLDivElement>(null);

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_activeTab', activeTab);
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_clients', JSON.stringify(clients));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_faculty_db', JSON.stringify(facultyDatabase));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [facultyDatabase]);

  useEffect(() => {
    try {
      if (selectedClient) {
        localStorage.setItem('scholarsync_selectedClientId', selectedClient.id);
      } else {
        localStorage.removeItem('scholarsync_selectedClientId');
      }
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [selectedClient]);

  const addClient = (clientData: Partial<Client> & { name: string }) => {
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      advisor: '未分配',
      contact: '暂无联系方式',
      ...clientData
    };
    setClients([...clients, newClient]);
  };

  const batchAddClients = (newClients: Client[]) => {
    console.log('App: Batch adding clients', newClients.length);
    const processedClients = newClients.map(c => ({
      ...c,
      id: c.id || Math.random().toString(36).substr(2, 9)
    }));

    setClients(prev => {
      const clientMap = new Map(prev.map(c => [c.id, c]));
      processedClients.forEach(c => {
        clientMap.set(c.id, c);
      });
      const result = Array.from(clientMap.values());
      console.log('App: Total clients after batch add', result.length);
      return result;
    });
  };

  const updateClient = (updatedClient: Client) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
    if (selectedClient?.id === updatedClient.id) {
      setSelectedClient(updatedClient);
    }
  };

  const deleteClient = (clientId: string) => {
    console.log('App: Deleting client', clientId);
    window.alert('正在删除客户: ' + clientId);
    setClients(prev => {
      const filtered = prev.filter(c => c.id !== clientId);
      console.log('App: Clients after deletion', filtered.length);
      return filtered;
    });
    
    setFacultyDatabase(prev => prev.map(f => ({
      ...f,
      linkedClientIds: f.linkedClientIds?.filter(id => id !== clientId) || []
    })));

    setSelectedClient(prev => prev?.id === clientId ? null : prev);
  };

  // Faculty Database Operations
  const batchAddFacultyToDatabase = (items: { faculty: FacultyMember, country?: string, fieldCategory?: string, extra?: Partial<FacultyRecord> }[]) => {
    setFacultyDatabase(prev => {
      const newDatabase = [...prev];
      const addedIds: string[] = [];

      items.forEach(({ faculty, country: manualCountry, fieldCategory: manualField, extra }) => {
        const existing = newDatabase.find(f => 
          f.name.toLowerCase() === faculty.name.toLowerCase() && 
          f.university.toLowerCase() === faculty.university.toLowerCase()
        );

        // Unified Classifier Logic (re-implementing inside to avoid stale scope if needed, 
        // but here we can just use a helper or the one defined in the component if it doesn't use state)
        const classify = (f: FacultyMember, mCountry?: string, mField?: string) => {
          let normalizedManualCountry = mCountry;
          let manualSubRegion = "";
          if (mCountry) {
            const mcLower = mCountry.toLowerCase();
            if (mcLower.includes('china') || mcLower.includes('中国')) {
              normalizedManualCountry = '中国';
              if (mcLower.includes('beijing') || mcLower.includes('北京')) manualSubRegion = '北京';
              else if (mcLower.includes('shanghai') || mcLower.includes('上海')) manualSubRegion = '上海';
              else if (mcLower.includes('hangzhou') || mcLower.includes('杭州')) manualSubRegion = '杭州';
              else if (mcLower.includes('xi\'an') || mcLower.includes('xian') || mcLower.includes('西安')) manualSubRegion = '西安';
              else if (mcLower.includes('hong kong') || mcLower.includes('香港')) manualSubRegion = '香港';
            }
          }

          let country = normalizedManualCountry || f.matchReasoning?.locationCheck || "";
          let subRegion = manualSubRegion || "";
          let regionPath: string[] = [];
          if (country === '中国') {
            regionPath = ['中国', subRegion || '其他'];
          } else if (country) {
            regionPath = [country];
          }

          let fieldCategory = mField || "";
          let subFieldCategory = "";
          let path: string[] = [];

          if (!fieldCategory) {
            const fieldContext = (f.department + " " + (f.researchAreas?.join(" ") || "")).toLowerCase();
            if (fieldContext.includes('computer') || fieldContext.includes('software') || fieldContext.includes('ai') || fieldContext.includes('intelligence') || fieldContext.includes('data')) {
              fieldCategory = "计算机科学";
              if (fieldContext.includes('ai') || fieldContext.includes('intelligence') || fieldContext.includes('machine learning')) {
                subFieldCategory = "人工智能";
                path = ["工程与技术", "计算机科学", "人工智能"];
              } else if (fieldContext.includes('security') || fieldContext.includes('cryptography')) {
                subFieldCategory = "网络安全";
                path = ["工程与技术", "计算机科学", "网络安全"];
              } else if (fieldContext.includes('data') || fieldContext.includes('analytics') || fieldContext.includes('mining')) {
                subFieldCategory = "数据科学";
                path = ["工程与技术", "计算机科学", "数据科学"];
              } else {
                subFieldCategory = "通用计算机";
                path = ["工程与技术", "计算机科学"];
              }
            } else if (fieldContext.includes('mechanical') || fieldContext.includes('robotics') || fieldContext.includes('mechatronics') || fieldContext.includes('automation') || fieldContext.includes('control')) {
              fieldCategory = "机械工程";
              subFieldCategory = fieldContext.includes('robot') ? "机器人学" : "通用机械";
              path = ["工程与技术", "机械工程"];
            } else if (fieldContext.includes('finance') || fieldContext.includes('economics') || fieldContext.includes('accounting') || fieldContext.includes('business') || fieldContext.includes('management')) {
              fieldCategory = "商科与经济";
              if (fieldContext.includes('finance')) {
                subFieldCategory = "金融学";
                path = ["社会科学", "商科与经济", "金融学"];
              } else if (fieldContext.includes('economics')) {
                subFieldCategory = "经济学";
                path = ["社会科学", "商科与经济", "经济学"];
              } else {
                subFieldCategory = "工商管理";
                path = ["社会科学", "商科与经济", "工商管理"];
              }
            } else if (fieldContext.includes('biology') || fieldContext.includes('bio') || fieldContext.includes('genetics') || fieldContext.includes('medical') || fieldContext.includes('health')) {
              fieldCategory = "生物与医学";
              subFieldCategory = fieldContext.includes('medical') ? "临床医学" : "生物科学";
              path = ["生命科学", "生物与医学"];
            } else if (f.department) {
              fieldCategory = f.department;
              path = [f.department];
            }
          } else {
            path = [fieldCategory];
          }

          return { country, subRegion, regionPath, fieldCategory, subFieldCategory, classificationPath: path };
        };

        const classification = classify(faculty, manualCountry, manualField);
        const finalClassification = { ...classification, ...extra };

        if (existing) {
          const isManual = existing.classificationSource === 'manual' || existing.classificationSource === 'hybrid' || extra?.classificationSource === 'manual';
          const updatedIdx = newDatabase.findIndex(f => f.id === existing.id);
          newDatabase[updatedIdx] = {
            ...existing,
            ...faculty,
            country: isManual ? (extra?.country || existing.country) : classification.country,
            fieldCategory: isManual ? (extra?.fieldCategory || existing.fieldCategory) : classification.fieldCategory,
            subFieldCategory: isManual ? (extra?.subFieldCategory || existing.subFieldCategory) : classification.subFieldCategory,
            classificationPath: isManual ? (extra?.classificationPath || existing.classificationPath) : classification.classificationPath,
            classificationNote: extra?.classificationNote || existing.classificationNote,
            classificationSource: extra?.classificationSource || (isManual ? 'hybrid' : 'auto'),
            updatedAt: new Date().toISOString(),
            source: 'search'
          };
          addedIds.push(existing.id);
        } else {
          const newId = crypto.randomUUID();
          const newRecord: FacultyRecord = {
            ...faculty,
            id: newId,
            ...finalClassification,
            classificationSource: extra?.classificationSource || 'auto',
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'search',
            linkedClientIds: []
          };
          newDatabase.push(newRecord);
          addedIds.push(newId);
        }
      });

      return newDatabase;
    });
  };

  const addFacultyToDatabase = (faculty: FacultyMember, manualCountry?: string, manualField?: string, extra?: Partial<FacultyRecord>): string => {
    // Check for duplicates (Name + University)
    const existing = facultyDatabase.find(f => 
      f.name.toLowerCase() === faculty.name.toLowerCase() && 
      f.university.toLowerCase() === faculty.university.toLowerCase()
    );

    // Unified Classifier Logic
    const classify = (f: FacultyMember, mCountry?: string, mField?: string) => {
      // Normalize manual country if it contains China sub-regions
      let normalizedManualCountry = mCountry;
      let manualSubRegion = "";
      if (mCountry) {
        const mcLower = mCountry.toLowerCase();
        if (mcLower.includes('china') || mcLower.includes('中国')) {
          normalizedManualCountry = '中国';
          if (mcLower.includes('beijing') || mcLower.includes('北京')) manualSubRegion = '北京';
          else if (mcLower.includes('shanghai') || mcLower.includes('上海')) manualSubRegion = '上海';
          else if (mcLower.includes('hangzhou') || mcLower.includes('杭州')) manualSubRegion = '杭州';
          else if (mcLower.includes('xi\'an') || mcLower.includes('xian') || mcLower.includes('西安')) manualSubRegion = '西安';
          else if (mcLower.includes('hong kong') || mcLower.includes('香港')) manualSubRegion = '香港';
        }
      }

      // 1. Country & Region Classification
      let country = normalizedManualCountry || f.matchReasoning?.locationCheck || "";
      let subRegion = manualSubRegion;
      let regionPath = ["未分类"];

      const uni = f.university.toLowerCase();
      const dept = (f.department || "").toLowerCase();
      const loc = (f.matchReasoning?.locationCheck || "").toLowerCase();
      const context = `${uni} ${dept} ${loc}`.toLowerCase();

      // China Region Detection
      const chinaRegions = [
        { name: '北京', keywords: ['beijing', 'peking', '北京'] },
        { name: '上海', keywords: ['shanghai', '上海'] },
        { name: '杭州', keywords: ['hangzhou', 'zhejiang', 'west lake', '杭州', '浙江'] },
        { name: '西安', keywords: ['xi\'an', 'xian', 'shaanxi', 'northwestern polytechnical', 'xidian', '西安', '陕西'] },
        { name: '南京', keywords: ['nanjing', 'jiangsu', '南京', '江苏'] },
        { name: '广州', keywords: ['guangzhou', 'sun yat-sen', 'canton', '广州', '广东'] },
        { name: '深圳', keywords: ['shenzhen', 'sustech', '深圳'] },
        { name: '成都', keywords: ['chengdu', 'sichuan', '成都', '四川'] },
        { name: '武汉', keywords: ['wuhan', 'hubei', '武汉', '湖北'] },
        { name: '合肥', keywords: ['hefei', 'ustc', '合肥', '安徽'] },
        { name: '哈尔滨', keywords: ['harbin', 'hit', '哈尔滨', '黑龙江'] },
        { name: '香港', keywords: ['hong kong', 'hku', 'cuhk', 'ust', 'cityu', 'polyu', '香港'] },
        { name: '澳门', keywords: ['macau', 'macao', '澳门'] },
        { name: '台湾', keywords: ['taiwan', 'ntu', 'tsing hua university (taiwan)', '台湾'] },
      ];

      const detectedChinaRegion = chinaRegions.find(r => r.keywords.some(k => context.includes(k)));

      if (country === '中国' || detectedChinaRegion || context.includes('china') || context.includes('中国')) {
        country = '中国';
        if (manualSubRegion) {
          subRegion = manualSubRegion;
          regionPath = ['中国', manualSubRegion];
        } else if (detectedChinaRegion) {
          subRegion = detectedChinaRegion.name;
          regionPath = ['中国', detectedChinaRegion.name];
        } else {
          regionPath = ['中国'];
        }
      } else if (!country || country === "未核查" || country === "未分类") {
        if (uni.includes('stanford') || uni.includes('harvard') || uni.includes('mit') || uni.includes('california') || uni.includes('yale') || uni.includes('princeton') || uni.includes('columbia') || uni.includes('cornell') || uni.includes('pennsylvania')) {
          country = '美国';
          regionPath = ['美国'];
        } else if (uni.includes('oxford') || uni.includes('cambridge') || uni.includes('imperial') || uni.includes('ucl') || uni.includes('london') || uni.includes('manchester') || uni.includes('edinburgh')) {
          country = '英国';
          regionPath = ['英国'];
        } else if (uni.includes('melbourne') || uni.includes('sydney') || uni.includes('unsw') || uni.includes('queensland') || uni.includes('monash')) {
          country = '澳洲';
          regionPath = ['澳洲'];
        } else if (uni.includes('toronto') || uni.includes('ubc') || uni.includes('mcgill') || uni.includes('waterloo')) {
          country = '加拿大';
          regionPath = ['加拿大'];
        } else if (uni.includes('nus') || uni.includes('ntu') || uni.includes('singapore')) {
          country = '新加坡';
          regionPath = ['新加坡'];
        } else {
          country = country || '未分类';
          regionPath = [country];
        }
      } else {
        regionPath = [country];
      }

      // 2. Field Classification
      const fieldContext = `${f.department || ''} ${f.researchAreas.join(' ')} ${f.alignmentDetails || ''} ${f.title}`.toLowerCase();
      
      let fieldCategory = mField || "未分类";
      let subFieldCategory = "未分类";
      let path = ["未分类"];

      // Simple keyword-based scoring/matching
      if (fieldCategory === "未分类" || !mField) {
        if (fieldContext.includes('computer science') || fieldContext.includes('cs') || fieldContext.includes('software') || fieldContext.includes('artificial intelligence') || fieldContext.includes('ai') || fieldContext.includes('machine learning') || fieldContext.includes('data science')) {
          fieldCategory = "计算机科学";
          if (fieldContext.includes('ai') || fieldContext.includes('machine learning') || fieldContext.includes('deep learning') || fieldContext.includes('neural')) {
            subFieldCategory = "人工智能";
            path = ["工程与技术", "计算机科学", "人工智能"];
          } else if (fieldContext.includes('security') || fieldContext.includes('cryptography') || fieldContext.includes('privacy')) {
            subFieldCategory = "网络安全";
            path = ["工程与技术", "计算机科学", "网络安全"];
          } else if (fieldContext.includes('data') || fieldContext.includes('analytics') || fieldContext.includes('mining')) {
            subFieldCategory = "数据科学";
            path = ["工程与技术", "计算机科学", "数据科学"];
          } else {
            subFieldCategory = "通用计算机";
            path = ["工程与技术", "计算机科学"];
          }
        } else if (fieldContext.includes('mechanical') || fieldContext.includes('robotics') || fieldContext.includes('mechatronics') || fieldContext.includes('automation') || fieldContext.includes('control')) {
          fieldCategory = "机械工程";
          subFieldCategory = fieldContext.includes('robot') ? "机器人学" : "通用机械";
          path = ["工程与技术", "机械工程"];
        } else if (fieldContext.includes('finance') || fieldContext.includes('economics') || fieldContext.includes('accounting') || fieldContext.includes('business') || fieldContext.includes('management')) {
          fieldCategory = "商科与经济";
          if (fieldContext.includes('finance')) {
            subFieldCategory = "金融学";
            path = ["社会科学", "商科与经济", "金融学"];
          } else if (fieldContext.includes('economics')) {
            subFieldCategory = "经济学";
            path = ["社会科学", "商科与经济", "经济学"];
          } else {
            subFieldCategory = "工商管理";
            path = ["社会科学", "商科与经济", "工商管理"];
          }
        } else if (fieldContext.includes('biology') || fieldContext.includes('bio') || fieldContext.includes('genetics') || fieldContext.includes('medical') || fieldContext.includes('health')) {
          fieldCategory = "生物与医学";
          subFieldCategory = fieldContext.includes('medical') ? "临床医学" : "生物科学";
          path = ["生命科学", "生物与医学"];
        } else if (f.department) {
          fieldCategory = f.department;
          path = [f.department];
        }
      } else {
        path = [fieldCategory];
      }

      return { country, subRegion, regionPath, fieldCategory, subFieldCategory, classificationPath: path };
    };

    // Use existing logic but allow extra to override
    const classification = classify(faculty, manualCountry, manualField);
    
    const finalClassification = {
      ...classification,
      ...extra
    };

    if (existing) {
      // Update existing
      setFacultyDatabase(prev => prev.map(f => {
        if (f.id === existing.id) {
          // If manual classification exists, don't overwrite with auto
          const isManual = f.classificationSource === 'manual' || f.classificationSource === 'hybrid' || extra?.classificationSource === 'manual';
          
          return {
            ...f,
            ...faculty,
            country: isManual ? (extra?.country || f.country) : classification.country,
            fieldCategory: isManual ? (extra?.fieldCategory || f.fieldCategory) : classification.fieldCategory,
            subFieldCategory: isManual ? (extra?.subFieldCategory || f.subFieldCategory) : classification.subFieldCategory,
            classificationPath: isManual ? (extra?.classificationPath || f.classificationPath) : classification.classificationPath,
            classificationNote: extra?.classificationNote || f.classificationNote,
            classificationSource: extra?.classificationSource || (isManual ? 'hybrid' : 'auto'),
            updatedAt: new Date().toISOString(),
            source: 'search'
          };
        }
        return f;
      }));
      return existing.id;
    }

    const newId = crypto.randomUUID();
    const newRecord: FacultyRecord = {
      ...faculty,
      id: newId,
      ...finalClassification,
      classificationSource: extra?.classificationSource || 'auto',
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'search',
      linkedClientIds: []
    };
    setFacultyDatabase(prev => [...prev, newRecord]);
    return newId;
  };

  const updateFacultyRecord = (id: string, updates: Partial<FacultyRecord>) => {
    setFacultyDatabase(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ));
  };

  const batchUpdateFacultyRecords = (ids: string[], updates: Partial<FacultyRecord>) => {
    setFacultyDatabase(prev => prev.map(f => 
      ids.includes(f.id) ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ));
  };

  const deleteFacultyRecord = (id: string) => {
    // 1. Remove from database
    setFacultyDatabase(prev => prev.filter(f => f.id !== id));
    
    // 2. Remove references from clients
    setClients(prev => prev.map(client => {
      if (client.linkedFacultyIds?.includes(id)) {
        return {
          ...client,
          linkedFacultyIds: client.linkedFacultyIds.filter(fid => fid !== id)
        };
      }
      return client;
    }));
    
    // Update selected client if needed
    setSelectedClient(prev => {
      if (prev?.linkedFacultyIds?.includes(id)) {
        return {
          ...prev,
          linkedFacultyIds: prev.linkedFacultyIds.filter(fid => fid !== id)
        };
      }
      return prev;
    });
  };

  const linkFacultyToClient = (facultyId: string, clientId: string) => {
    // 1. Update Faculty Record
    setFacultyDatabase(prev => prev.map(f => {
      if (f.id === facultyId) {
        const currentLinks = f.linkedClientIds || [];
        if (!currentLinks.includes(clientId)) {
          return { ...f, linkedClientIds: [...currentLinks, clientId] };
        }
      }
      return f;
    }));

    // 2. Update Client Record
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const currentLinks = c.linkedFacultyIds || [];
        if (!currentLinks.includes(facultyId)) {
          return { ...c, linkedFacultyIds: [...currentLinks, facultyId] };
        }
      }
      return c;
    }));

    // Update selected client if needed
    setSelectedClient(prev => {
      if (prev?.id === clientId) {
        const currentLinks = prev.linkedFacultyIds || [];
        if (!currentLinks.includes(facultyId)) {
          return { ...prev, linkedFacultyIds: [...currentLinks, facultyId] };
        }
      }
      return prev;
    });
  };

  const unlinkFacultyFromClient = (facultyId: string, clientId: string) => {
    // 1. Update Faculty Record
    setFacultyDatabase(prev => prev.map(f => {
      if (f.id === facultyId) {
        return { ...f, linkedClientIds: (f.linkedClientIds || []).filter(cid => cid !== clientId) };
      }
      return f;
    }));

    // 2. Update Client Record
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, linkedFacultyIds: (c.linkedFacultyIds || []).filter(fid => fid !== facultyId) };
      }
      return c;
    }));

    // Update selected client if needed
    setSelectedClient(prev => {
      if (prev?.id === clientId) {
        return {
          ...prev,
          linkedFacultyIds: (prev.linkedFacultyIds || []).filter(fid => fid !== facultyId)
        };
      }
      return prev;
    });
  };

  const saveDocument = (clientId: string, document: { id?: string; title: string; type: string; content: string }) => {
    let newId = document.id;
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        let updatedDocs;
        const existingDocIndex = c.documents?.findIndex(d => d.id === document.id);

        if (document.id && existingDocIndex !== undefined && existingDocIndex !== -1) {
          // Update existing
          updatedDocs = [...(c.documents || [])];
          updatedDocs[existingDocIndex] = {
            ...updatedDocs[existingDocIndex],
            title: document.title,
            content: document.content,
            updatedAt: new Date().toISOString()
          };
        } else {
          // Create new
          newId = Math.random().toString(36).substr(2, 9);
          const newDoc = {
            id: newId,
            title: document.title,
            type: document.type,
            content: document.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedDocs = [...(c.documents || []), newDoc];
        }

        const updatedClient = {
          ...c,
          documents: updatedDocs,
          documentCount: updatedDocs.length
        };
        
        if (selectedClient?.id === clientId) {
          setSelectedClient(updatedClient);
        }
        return updatedClient;
      }
      return c;
    });
    setClients(updatedClients);
    return newId;
  };

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - chatBotPosition.x,
      y: e.clientY - chatBotPosition.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setChatBotPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="h-full w-full relative">
        {/* Detail View: ClientDetail (Conditional) */}
        {activeTab === 'users' && selectedClient && (
          <div className="absolute inset-0 z-20 bg-[#F7F8FA]">
            <ClientDetail 
              client={selectedClient} 
              onBack={() => {
                setSelectedClient(null);
                setActiveTab(previousTab || 'users');
              }} 
              initialTab={clientDetailInitialTab}
              onStartWriting={(type) => {
                const tabMap: Record<string, TabId> = {
                  '文书Agent': 'agent',
                  '写PS': 'ps',
                  '写命题文书': 'essay',
                  '写推荐信': 'lor',
                  '写CV': 'cv',
                  '自由创作': 'freewrite'
                };
                if (type) {
                  setActiveTab(tabMap[type] || 'freewrite');
                } else {
                  setActiveTab('freewrite');
                }
              }}
              onEditDocument={(doc) => {
                const typeMap: Record<string, TabId> = {
                  'PS': 'ps',
                  'Essay': 'essay',
                  'LOR': 'lor',
                  'CV': 'cv',
                  'Free Writing': 'freewrite'
                };
                setEditingDocument({
                  id: doc.id,
                  content: doc.content,
                  type: doc.type,
                  title: doc.title
                });
                setActiveTab(typeMap[doc.type] || 'freewrite');
              }}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
              facultyDatabase={facultyDatabase}
              onLinkFacultyToClient={linkFacultyToClient}
              onUnlinkFacultyFromClient={unlinkFacultyFromClient}
            />
          </div>
        )}

        {/* Main Tabs (Keep-Alive) */}
        <div className={activeTab === 'dashboard' ? 'block h-full' : 'hidden'}>
          <Dashboard 
            onTabChange={setActiveTab} 
            clients={clients} 
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
              setActiveTab('users'); 
            }} 
            onUpdateClient={updateClient}
          />
        </div>

        <div className={activeTab === 'faculty-matcher' ? 'block h-full' : 'hidden'}>
          <FacultyMatcher 
            clients={clients}
            selectedClient={selectedClient}
            facultyDatabase={facultyDatabase}
            onAddFacultyToDatabase={addFacultyToDatabase}
            onLinkFacultyToClient={linkFacultyToClient}
            onUpdateClient={updateClient}
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })}
          />
        </div>

        <div className={activeTab === 'faculty-db' ? 'block h-full' : 'hidden'}>
          <FacultyDatabase 
            facultyDatabase={facultyDatabase}
            clients={clients}
            onAddFaculty={addFacultyToDatabase}
            onBatchAddFaculty={batchAddFacultyToDatabase}
            onUpdateFaculty={updateFacultyRecord}
            onBatchUpdateFaculty={batchUpdateFacultyRecords}
            onDeleteFaculty={deleteFacultyRecord}
            onLinkFaculty={linkFacultyToClient}
            onUnlinkFaculty={unlinkFacultyFromClient}
          />
        </div>

        <div className={activeTab === 'users' && !selectedClient ? 'block h-full' : 'hidden'}>
          <ClientArchives 
            clients={clients} 
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} 
            onBatchAddClients={batchAddClients}
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
            }} 
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
            onRestoreClient={(id) => {
              const client = clients.find(c => c.id === id);
              if (client) updateClient({ ...client, status: 'active' });
            }}
          />
        </div>

        <div className={activeTab === 'projects' ? 'block h-full' : 'hidden'}>
          <MyWorks 
            clients={clients} 
            onCreateNew={() => setActiveTab('freewrite')} 
            onEditDocument={(doc) => {
              const typeMap: Record<string, TabId> = {
                'PS': 'ps',
                'Essay': 'essay',
                'LOR': 'lor',
                'CV': 'cv',
                'Free Writing': 'freewrite'
              };
              setEditingDocument({
                id: doc.id,
                content: doc.content,
                type: doc.type,
                title: doc.title
              });
              // Find client for this doc to set selectedClient
              const client = clients.find(c => c.documents?.some(d => d.id === doc.id));
              if (client) {
                setPreviousTab(activeTab);
                setSelectedClient(client);
              }
              
              setActiveTab(typeMap[doc.type] || 'freewrite');
            }}
            onTabChange={setActiveTab}
          />
        </div>

        <div className={activeTab === 'agent' ? 'block h-full' : 'hidden'}>
          <EssayAgentEntry 
            clients={clients} 
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} 
            onSelectClient={(client) => {
              setPreviousTab(activeTab);
              setSelectedClient(client);
              setClientDetailInitialTab('documents');
              setActiveTab('users');
            }} 
          />
        </div>

        <div className={activeTab === 'ps' ? 'block h-full' : 'hidden'}>
          <PSWorkbench clients={clients} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'PS' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'essay' ? 'block h-full' : 'hidden'}>
          <PromptEssayWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Essay' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'lor' ? 'block h-full' : 'hidden'}>
          <LORWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'LOR' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'cv' ? 'block h-full' : 'hidden'}>
          <CVWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'CV' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'freewrite' ? 'block h-full' : 'hidden'}>
          <FreeWriteWorkbench clients={clients} onTabChange={setActiveTab} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Free Writing' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'ai-shield' ? 'block h-full' : 'hidden'}>
          <AIShieldWorkbench clients={clients} onSaveDocument={saveDocument} initialClientId={selectedClient?.id} onBack={() => setActiveTab('users')} />
        </div>

        <div className={activeTab === 'share' ? 'block h-full' : 'hidden'}>
          <ComingSoon title="推广合作" />
        </div>

        <div className={activeTab === 'settings' ? 'block h-full' : 'hidden'}>
          <ComingSoon title="设置" />
        </div>
      </div>

      <CreateClientModal 
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onConfirm={(name, parsedData) => addClient({ name, ...parsedData })}
      />

      {/* Floating AI Assistant */}
      {!showChatBot && (
        <button 
          onClick={() => setShowChatBot(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-green-500 text-white rounded-full shadow-2xl shadow-green-200 flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Draggable ChatBot Window */}
      {showChatBot && (
        <div 
          ref={chatBotRef}
          style={{ 
            position: 'fixed', 
            left: chatBotPosition.x, 
            top: chatBotPosition.y,
            width: isChatBotMinimized ? '300px' : '400px',
            height: isChatBotMinimized ? 'auto' : '600px',
            zIndex: 100
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200"
        >
          {/* Draggable Header */}
          <div 
            onMouseDown={handleMouseDown}
            className="h-10 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 cursor-move select-none"
          >
            <div className="flex items-center space-x-2 text-gray-500">
              <GripHorizontal size={16} />
              <span className="text-xs font-bold">学术助手</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsChatBotMinimized(!isChatBotMinimized)}
                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
              >
                {isChatBotMinimized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button 
                onClick={() => setShowChatBot(false)}
                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ChatBot Content */}
          {!isChatBotMinimized && (
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;
