import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDateLabel, getTodayStr } from '../utils/helpers';
import api from '../utils/api';
import ConfirmDialog from './ConfirmDialog';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ComputerIcon from '@mui/icons-material/Computer';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderIcon from '@mui/icons-material/Folder';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Left sidebar: narrower panel, Create New Release, download, entries grouped by year
 * with expand/collapse, and Deleted Items section at the bottom.
 */
export default function Sidebar() {
    const {
        entries, setEntries, sidebarOpen, setSidebarOpen,
        selectedEntryId, navigateToEntry, navigateHome,
        setView, view, addToast, navigateToDeleted,
    } = useAppContext();
    const { isLeadOnly } = useAuth();

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletedCount, setDeletedCount] = useState(0);
    const [expandedYears, setExpandedYears] = useState({});
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editOwner, setEditOwner] = useState('');
    const [ownerError, setOwnerError] = useState('');
    const [dateError, setDateError] = useState('');
    const [employees, setEmployees] = useState([]);
    const employeesRef = useRef([]);

    useEffect(() => {
        api.getEmployees().then(list => {
            const loaded = list || [];
            setEmployees(loaded);
            employeesRef.current = loaded;
        }).catch(() => { });
    }, []);

    // Release owners: career level 9 and below only
    const ownerOptions = employees.filter(e => {
        const cl = parseInt(String(e.careerLevel || '').replace(/[^0-9]/g, ''), 10);
        return !isNaN(cl) && cl <= 9;
    });

    // Load deleted items count
    useEffect(() => {
        const loadCount = async () => {
            try {
                const items = await api.getDeletedItems();
                setDeletedCount(items.length);
            } catch { /* ignore */ }
        };
        loadCount();
        const interval = setInterval(loadCount, 3000);
        return () => clearInterval(interval);
    }, [entries]);

    // Group entries by year
    const groupedEntries = useMemo(() => {
        const groups = {};
        entries.forEach(entry => {
            const year = new Date(entry.date + 'T00:00:00').getFullYear();
            if (!groups[year]) groups[year] = [];
            groups[year].push(entry);
        });
        // Sort years descending
        return Object.keys(groups)
            .sort((a, b) => b - a)
            .map(year => ({ year: parseInt(year), entries: groups[year] }));
    }, [entries]);

    // Auto-expand year that contains selected entry
    useEffect(() => {
        if (selectedEntryId) {
            const selectedEntry = entries.find(e => e.id === selectedEntryId);
            if (selectedEntry) {
                const year = new Date(selectedEntry.date + 'T00:00:00').getFullYear();
                setExpandedYears(prev => ({ ...prev, [year]: true }));
            }
        }
        // Auto-expand if only one year group
        if (groupedEntries.length === 1) {
            setExpandedYears(prev => ({ ...prev, [groupedEntries[0].year]: true }));
        }
    }, [selectedEntryId, entries, groupedEntries]);

    const toggleYear = (year) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    const startEditing = (entry, e) => {
        e.stopPropagation();
        setEditingEntryId(entry.id);
        setEditDate(entry.date);
        setEditOwner(entry.releaseOwner);
    };

    const cancelEditing = (e) => {
        if (e) e.stopPropagation();
        setEditingEntryId(null);
        setEditDate('');
        setEditOwner('');
        setOwnerError('');
        setDateError('');
    };

    const saveEditing = async (e) => {
        if (e) e.stopPropagation();
        if (!editOwner.trim()) { addToast('Release Owner cannot be empty', 'error'); return; }
        if (!editDate) { addToast('Date cannot be empty', 'error'); return; }
        // Future-date validation
        const today = getTodayStr();
        if (editDate < today) {
            setDateError('Please enter a future date');
            addToast('Please enter a future date', 'error');
            return;
        }
        setDateError('');
        // Always validate against the latest employee list via ref (career level 9 and below only)
        const empList = employeesRef.current.filter(e => {
            const cl = parseInt(String(e.careerLevel || '').replace(/[^0-9]/g, ''), 10);
            return !isNaN(cl) && cl <= 9;
        });
        if (empList.length > 0) {
            const valid = empList.some(emp =>
                emp.name.toLowerCase() === editOwner.trim().toLowerCase() ||
                emp.id.toLowerCase() === editOwner.trim().toLowerCase()
            );
            if (!valid) { setOwnerError('Enter valid Name'); return; }
        }
        setOwnerError('');
        try {
            const empId = localStorage.getItem('empId') || 'UNKNOWN';
            await api.updateEntry(editingEntryId, { releaseOwner: editOwner.trim(), date: editDate, changedBy: empId });
            const list = await api.getEntries();
            setEntries(list);
            addToast('Entry updated successfully', 'success');
            setEditingEntryId(null);
        } catch (err) {
            addToast(err.message || 'Update failed', 'error');
        }
    };

    const handleDownload = () => {
        if (!selectedEntryId) { addToast('Select an entry first to download', 'error'); return; }
        window.open(api.getExportUrl(selectedEntryId), '_blank');
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteEntry(deleteTarget.id);
            const list = await api.getEntries();
            setEntries(list);
            if (selectedEntryId === deleteTarget.id) navigateHome();
            addToast(`Entry "${formatDateLabel(deleteTarget.date)}" deleted`, 'success');
            const items = await api.getDeletedItems();
            setDeletedCount(items.length);
        } catch (err) {
            addToast(err.message, 'error');
        }
        setDeleteTarget(null);
    };

    const w = sidebarOpen ? 230 : 52;

    return (
        <Box sx={{
            width: w, minWidth: w, transition: 'width .2s', bgcolor: '#1e1b4b',
            borderRight: '1px solid #312e81', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', flexShrink: 0, color: '#e0e7ff',
        }}>
            {/* Toggle + title row */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 1, gap: 1, borderBottom: '1px solid #312e81' }}>
                <IconButton size="small" onClick={() => setSidebarOpen(p => !p)}
                    aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    sx={{ color: '#c7d2fe' }}>
                    {sidebarOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                </IconButton>
                {sidebarOpen && (
                    <>
                        <Typography variant="caption" fontWeight={700} color="#a5b4fc"
                            sx={{ textTransform: 'uppercase', letterSpacing: '.05em', flex: 1 }}>
                            New Entries
                        </Typography>
                        <Tooltip title="Download CSV">
                            <IconButton size="small" onClick={handleDownload} sx={{ color: '#c7d2fe' }}>
                                <DownloadIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Box>

            {sidebarOpen && (
                <>
                    <Box sx={{ px: 1.5, py: 1.5 }}>
                        {!isLeadOnly && (
                            <Button variant="contained" fullWidth size="small"
                                startIcon={<ComputerIcon />}
                                onClick={() => setView('create')}
                                sx={{ textTransform: 'none', bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontSize: 12 }}>
                                Create New Release
                            </Button>
                        )}
                    </Box>
                    <Divider sx={{ borderColor: '#312e81' }} />
                    <List dense sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
                        {entries.length === 0 && (
                            <Typography variant="body2" color="#a5b4fc" sx={{ textAlign: 'center', py: 3 }}>
                                No entries yet
                            </Typography>
                        )}
                        {groupedEntries.map(({ year, entries: yearEntries }) => (
                            <React.Fragment key={year}>
                                {/* Year header with expand/collapse */}
                                <ListItemButton onClick={() => toggleYear(year)}
                                    sx={{
                                        borderRadius: 1, mb: 0.3, py: 0.5,
                                        bgcolor: '#252149', '&:hover': { bgcolor: '#312e81' },
                                    }}>
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                        <FolderIcon sx={{ fontSize: 16, color: '#818cf8' }} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={String(year)}
                                        primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: '#c7d2fe' }}
                                    />
                                    <Typography variant="caption" sx={{ color: '#a5b4fc', mr: 0.5, fontSize: 11 }}>
                                        ({yearEntries.length})
                                    </Typography>
                                    {expandedYears[year] ? (
                                        <ExpandLessIcon sx={{ fontSize: 16, color: '#a5b4fc' }} />
                                    ) : (
                                        <ExpandMoreIcon sx={{ fontSize: 16, color: '#a5b4fc' }} />
                                    )}
                                </ListItemButton>
                                <Collapse in={!!expandedYears[year]} timeout="auto">
                                    {yearEntries.map(entry => (
                                        editingEntryId === entry.id ? (
                                            <Box key={entry.id} sx={{ px: 1.5, py: 1, ml: 2, mb: 0.5, bgcolor: '#252149', borderRadius: 1, border: '1px solid #4f46e5' }}>
                                                <Autocomplete
                                                    freeSolo
                                                    size="small"
                                                    options={ownerOptions}
                                                    getOptionLabel={o => typeof o === 'string' ? o : o.name}
                                                    inputValue={editOwner}
                                                    onInputChange={(_, val) => { setEditOwner(val); setOwnerError(''); }}
                                                    onChange={(_, val) => { if (val && typeof val === 'object') { setEditOwner(val.name); setOwnerError(''); } }}
                                                    filterOptions={(opts, { inputValue }) => {
                                                        if (!inputValue || inputValue.length < 2) return [];
                                                        const q = inputValue.toLowerCase();
                                                        return opts.filter(o => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)).slice(0, 8);
                                                    }}
                                                    renderOption={(props, o) => (
                                                        <li {...props} key={o.id}>
                                                            <Typography sx={{ fontSize: 11 }}>{o.name}</Typography>
                                                        </li>
                                                    )}
                                                    renderInput={(params) => (
                                                        <TextField {...params} label="Owner"
                                                            error={!!ownerError}
                                                            helperText={ownerError}
                                                            onClick={e => e.stopPropagation()}
                                                            sx={{ mb: 0.8, '& .MuiInputBase-input': { fontSize: 12, py: 0.5, color: '#e0e7ff' }, '& .MuiInputLabel-root': { fontSize: 11 } }} />
                                                    )}
                                                    ListboxProps={{ sx: { maxHeight: 180, fontSize: 11 } }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <TextField fullWidth size="small" type="date" label="Date" value={editDate}
                                                    onChange={e => { setEditDate(e.target.value); setDateError(''); }}
                                                    onClick={e => e.stopPropagation()}
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{ min: getTodayStr() }}
                                                    error={!!dateError}
                                                    helperText={dateError}
                                                    sx={{
                                                        mb: 0.8, '& .MuiInputBase-input': { fontSize: 12, py: 0.5, color: '#e0e7ff' }, '& .MuiInputLabel-root': { fontSize: 11 },
                                                        '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' }
                                                    }} />
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                    <Tooltip title="Save">
                                                        <IconButton size="small" onClick={saveEditing} sx={{ color: '#34d399' }}>
                                                            <CheckIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Cancel">
                                                        <IconButton size="small" onClick={cancelEditing} sx={{ color: '#f87171' }}>
                                                            <CloseIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <ListItemButton key={entry.id} selected={selectedEntryId === entry.id}
                                                onClick={() => navigateToEntry(entry.id)}
                                                sx={{
                                                    borderRadius: 1, mb: 0.3, pr: 1, pl: 3, color: '#e0e7ff',
                                                    '&.Mui-selected': { bgcolor: '#312e81' },
                                                    '&:hover': { bgcolor: '#312e81' }
                                                }}>
                                                <ListItemIcon sx={{ minWidth: 26 }}>
                                                    <CalendarTodayIcon sx={{ fontSize: 15, color: '#a5b4fc' }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={formatDateLabel(entry.date)}
                                                    secondary={entry.releaseOwner}
                                                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600, color: '#e0e7ff' }}
                                                    secondaryTypographyProps={{ fontSize: 11, noWrap: true, color: '#a5b4fc' }}
                                                />
                                                <Tooltip title="Edit date/owner">
                                                    {!isLeadOnly && (
                                                        <IconButton size="small" edge="end"
                                                            onClick={(e) => startEditing(entry, e)}
                                                            sx={{ opacity: 0.4, '&:hover': { opacity: 1 }, color: '#818cf8', mr: 0.2 }}>
                                                            <EditIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    )}
                                                </Tooltip>
                                                {!isLeadOnly && (
                                                    <IconButton size="small" edge="end"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry); }}
                                                        aria-label={`Delete ${formatDateLabel(entry.date)}`}
                                                        sx={{ opacity: 0.4, '&:hover': { opacity: 1 }, color: '#c7d2fe' }}>
                                                        <DeleteIcon sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                )}
                                            </ListItemButton>
                                        )
                                    ))}
                                </Collapse>
                            </React.Fragment>
                        ))}
                    </List>

                    {/* Deleted Items Section — hidden for CL9 leads */}
                    {!isLeadOnly && <Divider sx={{ borderColor: '#312e81' }} />}
                    {!isLeadOnly && (
                        <Box sx={{ px: 1.5, py: 1.5 }}>
                            <Button fullWidth size="small" variant={view === 'deleted' ? 'contained' : 'outlined'}
                                startIcon={
                                    <Badge badgeContent={deletedCount} color="error" max={99}
                                        sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}>
                                        <DeleteSweepIcon />
                                    </Badge>
                                }
                                onClick={navigateToDeleted}
                                sx={{
                                    textTransform: 'none', fontSize: 12, justifyContent: 'flex-start', pl: 2,
                                    color: view === 'deleted' ? '#fff' : '#e0e7ff',
                                    borderColor: '#4f46e5',
                                    bgcolor: view === 'deleted' ? '#4f46e5' : 'transparent',
                                    '&:hover': { bgcolor: '#312e81', borderColor: '#6366f1' },
                                }}>
                                Deleted Items
                            </Button>
                        </Box>
                    )}
                </>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Entry"
                message={`Are you sure you want to delete this entry?${deleteTarget ? ` (${formatDateLabel(deleteTarget.date)})` : ''}`}
                onYes={confirmDelete}
                onNo={() => setDeleteTarget(null)}
            />
        </Box>
    );
}
