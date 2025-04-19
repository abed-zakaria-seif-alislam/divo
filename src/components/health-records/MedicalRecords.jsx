import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import Card from '../common/Card';
import Button from '../common/Button';
import Alert from '../common/Alert';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import Tooltip from '../common/Tooltip';

const MedicalRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([
    'Lab Results', 
    'Imaging', 
    'Prescriptions', 
    'Discharge Summary', 
    'Clinical Notes', 
    'Vaccination Records',
    'Insurance',
    'Other'
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Lab Results',
    date: new Date().toISOString().split('T')[0],
    file: null,
    fileName: '',
    fileType: '',
    fileSize: 0,
  });

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each record file
      const recordsWithUrls = await Promise.all(data.map(async (record) => {
        const { data: urlData } = await supabase
          .storage
          .from('medical_records')
          .createSignedUrl(`${user.id}/${record.file_path}`, 60 * 60); // 1 hour expiry

        return {
          ...record,
          signedUrl: urlData?.signedUrl || null,
          thumbnailUrl: generateThumbnailUrl(record.file_type, record.file_path)
        };
      }));

      setRecords(recordsWithUrls || []);
    } catch (err) {
      console.error('Error fetching medical records:', err);
      setError('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const generateThumbnailUrl = (fileType, filePath) => {
    // For image files, we could generate thumbnails using storage
    // For PDF and other documents, return appropriate icons
    if (fileType.startsWith('image/')) {
      return supabase.storage.from('medical_records').getPublicUrl(`${user.id}/${filePath}`).data.publicUrl;
    } else if (fileType === 'application/pdf') {
      return '/images/pdf-icon.png'; // Replace with your PDF icon path
    } else {
      return '/images/document-icon.png'; // Replace with your document icon path
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    // Check file type (allow images, PDFs, common document types)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('File type not supported. Please upload images, PDFs or common document types.');
      return;
    }

    setFormData({
      ...formData,
      file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setUploading(true);
      
      // Create a unique file path
      const timestamp = new Date().getTime();
      const fileExt = formData.fileName.split('.').pop();
      const filePath = `${timestamp}-${formData.fileName.replace(/\s+/g, '_')}`;
      
      // Upload the file to storage
      const { error: uploadError } = await supabase.storage
        .from('medical_records')
        .upload(`${user.id}/${filePath}`, formData.file, {
          cacheControl: '3600',
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });
      
      if (uploadError) throw uploadError;
      
      // Create a record in the database
      const { data, error: insertError } = await supabase
        .from('medical_records')
        .insert([
          {
            patient_id: user.id,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            record_date: formData.date,
            file_path: filePath,
            file_name: formData.fileName,
            file_type: formData.fileType,
            file_size: formData.fileSize,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (insertError) throw insertError;
      
      // Get the signed URL for the uploaded file
      const { data: urlData } = await supabase
        .storage
        .from('medical_records')
        .createSignedUrl(`${user.id}/${filePath}`, 60 * 60); // 1 hour expiry
      
      const newRecord = {
        ...data[0],
        signedUrl: urlData?.signedUrl || null,
        thumbnailUrl: generateThumbnailUrl(formData.fileType, filePath)
      };
      
      // Update the UI
      setRecords([newRecord, ...records]);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'Lab Results',
        date: new Date().toISOString().split('T')[0],
        file: null,
        fileName: '',
        fileType: '',
        fileSize: 0,
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setShowAddModal(false);
    } catch (err) {
      console.error('Error uploading medical record:', err);
      setError('Failed to upload medical record');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      try {
        // Delete the file from storage
        const { error: storageError } = await supabase
          .storage
          .from('medical_records')
          .remove([`${user.id}/${record.file_path}`]);
        
        if (storageError) throw storageError;
        
        // Delete the record from the database
        const { error: deleteError } = await supabase
          .from('medical_records')
          .delete()
          .eq('id', record.id);
        
        if (deleteError) throw deleteError;
        
        // Update the UI
        setRecords(records.filter(r => r.id !== record.id));
        
        // Close the view modal if open
        if (showViewModal && currentRecord?.id === record.id) {
          setShowViewModal(false);
          setCurrentRecord(null);
        }
      } catch (err) {
        console.error('Error deleting medical record:', err);
        setError('Failed to delete medical record');
      }
    }
  };

  const openViewModal = (record) => {
    setCurrentRecord(record);
    setShowViewModal(true);
  };

  const handleDownload = async (record) => {
    try {
      if (!record.signedUrl) {
        // If the signed URL is expired, generate a new one
        const { data } = await supabase
          .storage
          .from('medical_records')
          .createSignedUrl(`${user.id}/${record.file_path}`, 60 * 60); // 1 hour expiry
        
        record.signedUrl = data?.signedUrl;
        
        if (!record.signedUrl) {
          throw new Error('Failed to generate download URL');
        }
      }
      
      // Create temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = record.signedUrl;
      link.download = record.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const filteredRecords = records
    .filter(record => 
      (selectedCategory === 'all' || record.category === selectedCategory) &&
      (searchTerm === '' || 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        record.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">Medical Records</h2>
        
        <Button 
          onClick={() => setShowAddModal(true)} 
          className="flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Upload Medical Record
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/2">
          <label htmlFor="search" className="sr-only">Search Records</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              name="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="md:w-1/2">
          <label htmlFor="category" className="sr-only">Filter by Category</label>
          <select
            id="category"
            name="category"
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No Medical Records"
          description="You haven't uploaded any medical records yet."
          action={
            <Button onClick={() => setShowAddModal(true)}>
              Upload Your First Record
            </Button>
          }
        />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No Results Found"
          description="No records match your search criteria. Try different keywords or filter."
          action={
            <Button variant="secondary" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map(record => (
            <Card key={record.id} className="overflow-hidden flex flex-col">
              {/* Record Preview */}
              <div 
                className="h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => openViewModal(record)}
              >
                {record.file_type.startsWith('image/') && record.thumbnailUrl ? (
                  <img 
                    src={record.thumbnailUrl} 
                    alt={record.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-gray-400 mb-2 flex justify-center">
                      {getFileIcon(record.file_type)}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {record.file_name}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Record Details */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    className="font-medium text-lg cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 truncate" 
                    onClick={() => openViewModal(record)}
                    title={record.title}
                  >
                    {record.title}
                  </h3>
                  
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {record.category}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                  {record.description || 'No description provided.'}
                </p>
                
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(record.record_date)}
                    
                    <span className="mx-2">•</span>
                    
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    {formatFileSize(record.file_size)}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1 justify-center"
                      onClick={() => openViewModal(record)}
                    >
                      View
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1 justify-center"
                      onClick={() => handleDownload(record)}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Record Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({
            title: '',
            description: '',
            category: 'Lab Results',
            date: new Date().toISOString().split('T')[0],
            file: null,
            fileName: '',
            fileType: '',
            fileSize: 0,
          });
          setError(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        title="Upload Medical Record"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title*
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Blood Test Results"
            />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category*
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Record Date*
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Optional description of this medical record"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File Upload*
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      className="sr-only" 
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF, PDF or DOCX up to 10MB
                </p>
              </div>
            </div>
            
            {formData.fileName && (
              <div className="mt-3 flex items-center text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{formData.fileName}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  ({formatFileSize(formData.fileSize)})
                </span>
              </div>
            )}
          </div>
          
          {uploading && (
            <div>
              <label htmlFor="upload-progress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Progress: {uploadProgress}%
              </label>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div 
                  className="h-full bg-primary-600 dark:bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setFormData({
                  title: '',
                  description: '',
                  category: 'Lab Results',
                  date: new Date().toISOString().split('T')[0],
                  file: null,
                  fileName: '',
                  fileType: '',
                  fileSize: 0,
                });
                setError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={uploading || !formData.file}
            >
              {uploading ? 'Uploading...' : 'Upload Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Record Modal */}
      {currentRecord && (
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setCurrentRecord(null);
          }}
          title={currentRecord.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {currentRecord.category}
              </span>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(currentRecord.record_date)}
              </div>
            </div>
            
            {currentRecord.description && (
              <p className="text-gray-700 dark:text-gray-300 text-sm border-b dark:border-gray-700 pb-4">
                {currentRecord.description}
              </p>
            )}
            
            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              {currentRecord.file_type.startsWith('image/') ? (
                <img 
                  src={currentRecord.signedUrl} 
                  alt={currentRecord.title}
                  className="w-full max-h-96 object-contain"
                />
              ) : currentRecord.file_type === 'application/pdf' ? (
                <iframe 
                  src={currentRecord.signedUrl} 
                  title={currentRecord.title}
                  className="w-full h-96"
                />
              ) : (
                <div className="h-40 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 px-4 py-8">
                  <div className="text-gray-400 mb-2 flex justify-center">
                    {getFileIcon(currentRecord.file_type)}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentRecord.file_name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatFileSize(currentRecord.file_size)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mt-4">
              <Button 
                variant="danger"
                onClick={() => handleDeleteRecord(currentRecord)}
              >
                Delete Record
              </Button>
              <Button
                onClick={() => handleDownload(currentRecord)}
              >
                Download
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MedicalRecords;