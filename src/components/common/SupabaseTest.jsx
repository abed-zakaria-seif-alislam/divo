import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { setupSupabaseDatabase, createExecSQLFunction, setupDatabaseProcedures } from '../../lib/supabaseSetup';
import Button from './Button';
import Card from './Card';
import Alert from './Alert';

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [setupResults, setSetupResults] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [sqlToRun, setSqlToRun] = useState('');

  useEffect(() => {
    async function checkConnection() {
      try {
        // Simple test query to check if connected
        const { data, error } = await supabase.from('profiles').select('count()', { count: 'exact', head: true });

        if (error && error.code === '42P01') {
          // Table doesn't exist, but we're connected to Supabase
          setConnectionStatus('connected-no-tables');
          setMessage('Connected to Supabase successfully, but the required tables do not exist yet.');
        } else if (error) {
          setConnectionStatus('error');
          setError(error.message);
        } else {
          setConnectionStatus('connected');
          setMessage('Connected to Supabase successfully! Database tables are set up.');
        }
      } catch (e) {
        setConnectionStatus('error');
        setError(e.message);
      }
    }

    checkConnection();
  }, []);

  const handleSetupDatabase = async () => {
    setIsSettingUp(true);
    setMessage('Setting up Supabase database structure...');
    
    try {
      // First, we need the exec_sql function in Supabase
      const execSqlResult = await createExecSQLFunction();
      
      if (execSqlResult.sql) {
        setSqlToRun(execSqlResult.sql);
        setMessage('To proceed with the setup, you need to run the SQL shown below in the Supabase SQL Editor first.');
        setIsSettingUp(false);
        return;
      }

      // Set up stored procedures
      const proceduresResult = await setupDatabaseProcedures();
      
      if (!proceduresResult.success) {
        setError(`Failed to set up procedures: ${proceduresResult.error}`);
        setIsSettingUp(false);
        return;
      }

      // Now run the setup to create tables and policies
      const result = await setupSupabaseDatabase();
      setSetupResults(result);
      
      if (result.success) {
        setMessage('Database setup completed successfully!');
        setConnectionStatus('connected');
      } else {
        setError(`Setup encountered some errors: ${result.errors.join(', ')}`);
      }
    } catch (e) {
      setError(`Setup error: ${e.message}`);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <Card className="p-5 max-w-2xl mx-auto my-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Supabase Connection Test</h2>
        <div className="flex justify-center items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              connectionStatus === 'checking' ? 'bg-yellow-500' : 
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connected-no-tables' ? 'bg-blue-500' : 'bg-red-500'
            }`}
          ></div>
          <p className="text-gray-600">
            {connectionStatus === 'checking' ? 'Checking connection...' : 
             connectionStatus === 'connected' ? 'Connected to Supabase' : 
             connectionStatus === 'connected-no-tables' ? 'Connected (Tables Missing)' : 'Connection Error'}
          </p>
        </div>
      </div>

      {message && (
        <p className="text-center mb-4 text-gray-700">
          {message}
        </p>
      )}

      {error && (
        <Alert 
          type="error" 
          title="Connection Error" 
          message={error} 
          className="mb-4" 
        />
      )}

      {sqlToRun && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Run this SQL in your Supabase SQL Editor:</h3>
          <div className="bg-gray-100 p-3 rounded-md overflow-auto text-sm">
            <pre>{sqlToRun}</pre>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            After running this SQL, come back and click "Set Up Database" again.
          </p>
        </div>
      )}

      {setupResults && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Setup Results:</h3>
          
          {setupResults.created.length > 0 && (
            <div className="mb-2">
              <p className="font-medium text-green-600">Created:</p>
              <ul className="list-disc pl-5">
                {setupResults.created.map((item, i) => (
                  <li key={i} className="text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {setupResults.errors.length > 0 && (
            <div>
              <p className="font-medium text-red-600">Errors:</p>
              <ul className="list-disc pl-5">
                {setupResults.errors.map((item, i) => (
                  <li key={i} className="text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center mt-4">
        {(connectionStatus === 'connected-no-tables' || error) && (
          <Button 
            onClick={handleSetupDatabase}
            disabled={isSettingUp}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSettingUp ? 'Setting Up...' : 'Set Up Database'}
          </Button>
        )}
        
        {connectionStatus === 'connected' && !error && (
          <div className="text-center">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-md mb-3">
              ✅ Your Supabase database is properly configured!
            </div>
            <Button 
              onClick={handleSetupDatabase}
              variant="outline"
              className="border-gray-300 text-gray-600"
            >
              Rerun Setup
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SupabaseTest;