
(function(){
    function createDashboardChart(data){
        // تحقق من نوع المستخدم لإظهار زر الإضافة والبيانات الكاملة
        let isSupervisor = false;
        try {
            const raw = localStorage.getItem('auth_user');
            if(raw){
                const auth = JSON.parse(raw);
                isSupervisor = auth && auth.role === 'supervisor';
            }
        } catch(e){}
        // إظهار زر الإضافة إذا كان مشرف
        try {
            const addBtn = document.querySelector('.btn-add');
            if(addBtn) addBtn.style.display = isSupervisor ? '' : 'none';
        } catch(e){}
        if (!window.Plotly) {
            const el = document.getElementById('departmentChart');
            if (el) el.innerHTML = '<p style="padding:20px; text-align:center;">الرسم البياني غير متاح (Plotly غير محمل)</p>';
            return;
        }
        if (!Array.isArray(data)) {
            const deptStats = data || {};
            const labels = ['البرمجيات', 'الأمن السيبراني', 'علوم الحاسوب'];
            const values = [
                deptStats['البرمجيات'] || 0,
                deptStats['الأمن السيبراني'] || 0,
                deptStats['علوم الحاسوب'] || 0
            ];
            const pie = [{
                type: 'pie',
                labels: labels,
                values: values,
                hole: 0.4,
                textinfo: 'label+percent',
                textposition: 'inside',
                hoverinfo: 'label+value',
                marker: { colors: ['#3498db', '#e74c3c', '#27ae60'], line: { color: '#ffffff', width: 2 } },
                pull: [0.02, 0.02, 0.02], sort: false
            }];
            const layout = { margin: { t: 20, b: 20, l: 20, r: 20 }, showlegend: true, legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.05 }, paper_bgcolor: 'transparent', font: { family: "'Cairo', sans-serif", size: 14 } };
            const config = { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['lasso2d','select2d'] };
            Plotly.newPlot('departmentChart', pie, layout, config).catch(err => {
                console.error('خطأ في عرض الرسم البياني:', err
                )}
            );
            return;
        }
        const students = data;
        const departments = Array.from(new Set(students.map(s => (s.DepartMent || s.department || s.Department || 'غير محدد').toString().trim())));
        const stages = Array.from(new Set(students.map(s => (s.StudentStage || s.stage || s.Stage || 'عام').toString().trim())));
        if (stages.length === 0) stages.push('الكل');
        const counts = {};
        stages.forEach(st => counts[st] = {});
        students.forEach(s => {
            const dept = (s.DepartMent || s.department || s.Department || 'غير محدد').toString().trim();
            const st = (s.StudentStage || s.stage || s.Stage || 'عام').toString().trim();
            if (!counts[st]) counts[st] = {};
            counts[st][dept] = (counts[st][dept] || 0) + 1;
        });
        function cuboidMesh(x, y, dz, dx = 0.6, dy = 0.6){
            const x0 = x - dx/2, x1 = x + dx/2;
            const y0 = y - dy/2, y1 = y + dy/2;
            const z0 = 0, z1 = dz;
            const verts = [ [x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1] ];
            const faces = [];
            const addFace = (a,b,c,d) => { faces.push([a,b,c]); faces.push([a,c,d]); };
            addFace(0,1,2,3); addFace(4,7,6,5); addFace(0,4,5,1); addFace(1,5,6,2); addFace(2,6,7,3); addFace(3,7,4,0);
            const xArr = [], yArr = [], zArr = [], i = [], j = [], k = [];
            verts.forEach(v => { xArr.push(v[0]); yArr.push(v[1]); zArr.push(v[2]); });
            faces.forEach(f => { i.push(f[0]); j.push(f[1]); k.push(f[2]); });
            return { x: xArr, y: yArr, z: zArr, i, j, k };
        }
        const seriesColors = ['#2b6fc6','#e74c3c','#27ae60','#f39c12','#8e44ad','#16a085'];
        const traces = [];
        stages.forEach((st, sIdx) => {
            const cubes = { x: [], y: [], z: [], i: [], j: [], k: [] };
            let vertexOffset = 0;
            departments.forEach((dept, dIdx) => {
                const val = counts[st][dept] || 0;
                const mesh = cuboidMesh(dIdx, sIdx, val, 0.6, 0.6);
                mesh.x.forEach(v => cubes.x.push(v));
                mesh.y.forEach(v => cubes.y.push(v));
                mesh.z.forEach(v => cubes.z.push(v));
                mesh.i.forEach(idx => cubes.i.push(idx + vertexOffset));
                mesh.j.forEach(idx => cubes.j.push(idx + vertexOffset));
                mesh.k.forEach(idx => cubes.k.push(idx + vertexOffset));
                vertexOffset += mesh.x.length;
            });
            traces.push({ type: 'mesh3d', x: cubes.x, y: cubes.y, z: cubes.z, i: cubes.i, j: cubes.j, k: cubes.k, opacity: 0.9, color: seriesColors[sIdx % seriesColors.length], name: st, hovertemplate: '%{z}<extra>' + st + '</extra>' });
        });
        const layout = {
            title: 'توزيع الطلاب (حسب القسم والمرحلة)',
            scene: {
                xaxis: { title: 'القسم', tickvals: departments.map((d,i)=>i), ticktext: departments, tickangle: -45 },
                yaxis: { title: 'المرحلة', tickvals: stages.map((s,i)=>i), ticktext: stages },
                zaxis: { title: 'عدد الطلاب' },
                camera: { eye: { x: 1.6, y: -1.6, z: 0.8 } }
            },
            legend: { orientation: 'h', x: 0.5, xanchor: 'center' },
            margin: { t: 40, b: 40, l: 50, r: 20 },
            font: { family: "'Cairo', sans-serif" }
        };
        Plotly.newPlot('departmentChart', traces, layout, {responsive: true, displayModeBar: true});
    }
    window.createDashboardChart = createDashboardChart;
})();
