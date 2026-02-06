import { useCallback } from 'react';

export const useTestParsing = () => {
  const parseTestConditionCheckpoints = useCallback((testCondition?: string) => {
    if (!testCondition || typeof testCondition !== 'string') {
      return [];
    }
    
    const condition = testCondition.trim();
    
    // 1. Check for "CP:" or "Checkpoints:" pattern
    const cpPattern = /(?:CP|Checkpoints?)[:\s]+(.+)/i;
    const cpMatch = condition.match(cpPattern);
    
    if (cpMatch) {
      const checkpointsStr = cpMatch[1].trim();
      return extractCheckpoints(checkpointsStr);
    }
    
    // 2. Check for "T" pattern
    const tPattern = /^T\d+.*/i;
    if (tPattern.test(condition)) {
      return extractCheckpoints(condition);
    }
    
    // 3. Check for time durations
    const timePattern = /(\d+\s*(?:hrs?|hours?|cycles?|drops?))/gi;
    const timeMatches = condition.match(timePattern);
    
    if (timeMatches && timeMatches.length > 1) {
      return timeMatches.map(match => match.trim());
    }
    
    // 4. Check for comma-separated numbers
    const numbersPattern = /(\d+(?:\s*,\s*\d+)+)/;
    const numbersMatch = condition.match(numbersPattern);
    
    if (numbersMatch) {
      const numbersStr = numbersMatch[1];
      const numbers = numbersStr.split(',').map(num => {
        const trimmed = num.trim();
        const unitMatch = condition.match(/(?:cycles?|drops?|hrs?|hours?)$/i);
        const unit = unitMatch ? unitMatch[0] : '';
        return trimmed + (unit ? ' ' + unit : '');
      });
      
      if (numbers.length > 1) {
        return numbers;
      }
    }
    
    // 5. Check for ranges
    const rangePattern = /(\d+)\s*[-–]\s*(\d+)\s*(cycles?|drops?|hrs?|hours?)/i;
    const rangeMatch = condition.match(rangePattern);
    
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      const unit = rangeMatch[3];
      
      if (start < end) {
        const checkpoints = [];
        for (let i = start; i <= end; i++) {
          checkpoints.push(`${i} ${unit}`);
        }
        return checkpoints;
      }
    }
    
    // 6. Special cases
    if (condition.includes('multiple checkpoints') || 
        condition.includes('checkpoints') ||
        condition.includes('time points')) {
      const allNumbers = condition.match(/\d+/g);
      if (allNumbers && allNumbers.length > 1) {
        return allNumbers.map(num => `${num}hrs`);
      }
    }
    
    return [];
  }, []);

  const extractCheckpoints = useCallback((checkpointsStr: string) => {
    const cleanedStr = checkpointsStr
      .replace(/\s+(?:cycles?|drops?|hrs?|hours?)$/i, '')
      .trim();
    
    const splitPattern = /[,;]|\s+and\s+/i;
    const rawCheckpoints = cleanedStr.split(splitPattern);
    
    return rawCheckpoints
      .map(cp => {
        let checkpoint = cp.trim();
        
        if (checkpoint.startsWith('T')) {
          checkpoint = checkpoint.replace(/^T/, 'T');
        }
        
        if (/^\d+$/.test(checkpoint)) {
          checkpoint = `${checkpoint}hrs`;
        }
        
        if (/\d+$/.test(checkpoint) && !/(?:hrs?|hours?|cycles?|drops?)$/i.test(checkpoint)) {
          checkpoint = `${checkpoint}hrs`;
        }
        
        checkpoint = checkpoint.replace(/(\d+)\s*hr\b/gi, '$1hrs');
        
        return checkpoint;
      })
      .filter(cp => cp && cp !== '');
  }, []);

  const normalizeMachineName = useCallback((machineName: string) => {
    if (!machineName) return '';
    
    if (machineName.includes('+')) {
      return machineName.trim();
    }
    
    const name = machineName.toLowerCase().trim();
    const mappings: Record<string, string> = {
      'dlsm random drop': 'DLSM RANDOM DROP',
      '1.25m random drop': '1.25M RANDOM DROP',
      'lm random drop': 'LM RANDOM DROP',
      'lm control drop': 'LM CONTROL DROP',
      'rock tumbler': 'ROCK TUMBLER',
      'x-rite spectralight iii': 'X-RITE SPECTRALIGHT III',
      'heat soak-01': 'HEAT SOAK-01',
      'heat soak-02': 'HEAT SOAK-02',
      'thermal cycle chamber': 'THERMAL CYCLE CHAMBER',
      'uv chamber': 'UV CHAMBER',
      'salt spray': 'SALT SPRAY',
      'taber linear abraser': 'TABER LINEAR ABRASER',
      'electromechanical utm instron': 'ELECTROMECHANICAL UTM INSTRON',
      'foot survivability test': 'FOOT SURVIVABILITY TEST',
      'oslr camera': 'OSLR Camera',
      'tap immersion': 'TAP Immersion',
      'pool immersion': 'POOL Immersion',
      'ocean immersion': 'OCEAN Immersion',
      'asi immersion': 'ASI Immersion',
      'heat soak': 'HEAT SOAK',
      'instron': 'INSTRON',
      'random drop': 'RANDOM DROP',
      'taber 5750': 'TABER 5750',
      'ctrl drop': 'CTRL DROP',
      'uv': 'UV',
      'asi': 'ASI Immersion'
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (name.includes(key) || key.includes(name)) {
        return value;
      }
    }

    return name.toUpperCase();
  }, []);

  const checkMachineMatch = useCallback((
    test: any,
    normalizedChamber: string,
    machineData: any[]
  ) => {
    const machinesToCheck = [
      test.machineEquipment,
      test.machineEquipment2
    ].filter(m => m && m.trim());
    
    for (const machine of machinesToCheck) {
      const normalizedMachine = normalizeMachineName(machine);
      
      // Condition 1: If specification contains multiple equipment
      if (test.specification && test.specification.includes('+')) {
        const equipmentList = test.specification.split('+').map((eq: string) => eq.trim());
        if (equipmentList.some((eq: string) => {
          const normalizedEq = normalizeMachineName(eq);
          return normalizedEq === normalizedChamber ||
                 normalizedEq.includes(normalizedChamber) ||
                 normalizedChamber.includes(normalizedEq);
        })) {
          return true;
        }
      }
      
      // Direct match
      if (normalizedMachine === normalizedChamber ||
          normalizedMachine.includes(normalizedChamber) ||
          normalizedChamber.includes(normalizedMachine)) {
        return true;
      }
    }
    
    return false;
  }, [normalizeMachineName]);

  return {
    parseTestConditionCheckpoints,
    normalizeMachineName,
    checkMachineMatch
  };
};