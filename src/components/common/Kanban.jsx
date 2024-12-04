import { Box, Button, Typography, Divider, TextField, IconButton, Card } from '@mui/material'
import { useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import sectionApi from '../../api/sectionApi'
import taskApi from '../../api/taskApi'
import TaskModal from './TaskModal'
import boardApi from '../../api/boardApi'
import jsPDF from 'jspdf'
import { useSelector } from 'react-redux';
import Chart from "chart.js/auto";
import html2canvas from "html2canvas";
import axios from "axios";

let timer
const timeout = 500

const Kanban = props => {
  const boardId = props.boardId
  const [data, setData] = useState([])
  const [selectedTask, setSelectedTask] = useState(undefined)

  useEffect(() => {
    setData(props.data)
  }, [props.data])

  const getSectionStatus = (index) => {
    switch (index) {
      case 0:
        return 'Pendiente'
      case 1:
        return 'En progreso'
      case 2:
        return 'Completada'
      default:
        return index
    }
  }

  const onDragEnd = async ({ source, destination }) => {
    if (!destination) return
    const sourceColIndex = data.findIndex(e => e.id === source.droppableId)
    const destinationColIndex = data.findIndex(e => e.id === destination.droppableId)
    const sourceCol = data[sourceColIndex]
    const destinationCol = data[destinationColIndex]

    const sourceSectionId = sourceCol.id
    const destinationSectionId = destinationCol.id

    const sourceTasks = [...sourceCol.tasks]
    const destinationTasks = [...destinationCol.tasks]

    if (source.droppableId !== destination.droppableId) {
      const [removed] = sourceTasks.splice(source.index, 1)
      destinationTasks.splice(destination.index, 0, removed)
      data[sourceColIndex].tasks = sourceTasks
      data[destinationColIndex].tasks = destinationTasks
    } else {
      const [removed] = destinationTasks.splice(source.index, 1)
      destinationTasks.splice(destination.index, 0, removed)
      data[destinationColIndex].tasks = destinationTasks
    }

    try {
      await taskApi.updatePosition(boardId, {
        resourceList: sourceTasks,
        destinationList: destinationTasks,
        resourceSectionId: sourceSectionId,
        destinationSectionId: destinationSectionId
      })
      setData(data)
    } catch (err) {
      alert(err)
    }

    const sourceStatus = getSectionStatus(sourceColIndex);
    const destinationStatus = getSectionStatus(destinationColIndex);

    const updateDetails = `La tarea se ha movido de la sección ${sourceStatus} a ${destinationStatus}.`
    sendUpdateNotification(updateDetails);
  }

  const createSection = async () => {
    try {
      const section = await sectionApi.create(boardId)
      setData([...data, section])
    } catch (err) {
      alert(err)
    }
  }

  const deleteSection = async (sectionId) => {
    try {
      await sectionApi.delete(boardId, sectionId)
      const newData = [...data].filter(e => e.id !== sectionId)
      setData(newData)
    } catch (err) {
      alert(err)
    }
  }

  const updateSectionTitle = async (e, sectionId) => {
    clearTimeout(timer)
    const newTitle = e.target.value
    const newData = [...data]
    const index = newData.findIndex(e => e.id === sectionId)
    newData[index].title = newTitle
    setData(newData)
    timer = setTimeout(async () => {
      try {
        await sectionApi.update(boardId, sectionId, { title: newTitle })
      } catch (err) {
        alert(err)
      }
    }, timeout);
  }

  const createTask = async (sectionId) => {
    try {
      const task = await taskApi.create(boardId, { sectionId })
      const newData = [...data]
      const index = newData.findIndex(e => e.id === sectionId)
      newData[index].tasks.unshift(task)
      setData(newData)
    } catch (err) {
      alert(err)
    }
  }

  const onUpdateTask = async (task) => {
    const newData = [...data]
    const sectionIndex = newData.findIndex(e => e.id === task.section.id)
    const taskIndex = newData[sectionIndex].tasks.findIndex(e => e.id === task.id)
    newData[sectionIndex].tasks[taskIndex] = task
    setData(newData)
    
    const updateDetails = `Tarea actualizada:\nTítulo: ${task.title}\nComentario: ${task.description || 'Sin comentario'}`;
    sendUpdateNotification(updateDetails);
  }

  const onDeleteTask = (task) => {
    const newData = [...data]
    const sectionIndex = newData.findIndex(e => e.id === task.section.id)
    const taskIndex = newData[sectionIndex].tasks.findIndex(e => e.id === task.id)
    newData[sectionIndex].tasks.splice(taskIndex, 1)
    setData(newData)
    window.location.reload()
  }

  const boards = useSelector((state) => state.board.value);

  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
  
    const activeItem = boards.findIndex(e => e.id === boardId);
    const boardName = boards[activeItem]?.title;
  
    if (boardName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`Proceso del proyecto: ${boardName}`, 20, 20);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`Proceso del proyecto: Nombre no disponible`, 20, 20);
    }
  
    let yPosition = 30;
  
    data.forEach(section => {
      const seccionLimpia = section.title.replace(/[^a-zA-Z0-9\s]/g, '');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sección: ${seccionLimpia}`, 20, yPosition);
      yPosition += 10;
  
      section.tasks.forEach(task => {
        doc.text(`  - Tarea: ${task.title === '' ? 'Untitled' : task.title}`, 20, yPosition);
        yPosition += 10;
      });
  
      yPosition += 10;
    });
  
    let totalTasks = 0;
    let completedTasks = 0;
  
    data.forEach(section => {
      totalTasks += section.tasks.length;
      if (section.title === '🟢 Completada') {
        completedTasks += section.tasks.length;
      }
    });
  
    const progressPercentage = totalTasks > 0 
      ? ((completedTasks / totalTasks) * 100).toFixed(2) 
      : 0;
  
    yPosition += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Progreso del proyecto: ${progressPercentage}% completado`, 20, yPosition);
  
    yPosition += 20;
  
    const canvas = document.createElement("canvas")
    canvas.width = 400; 
    canvas.height = 400;
    document.body.appendChild(canvas);

    const progress = parseFloat(progressPercentage)
    const pending = 100 - progress


    const ctx = canvas.getContext("2d")
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Completado", "Pendiente"],
        datasets: [
          {
            data: [progress, pending],
            backgroundColor: ["#4caf50", "#f44336"],
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              font: {
                size: 14,
              },
            },
          },
        },
      },
    });
  
    await new Promise((resolve) => setTimeout(resolve, 1500))
  
    const chartImage = await html2canvas(canvas).then((canvas) =>
      canvas.toDataURL("image/png")
    );
  
    doc.addImage(chartImage, "PNG", 20, yPosition, 160, 120);
  
    doc.save(`kanban-board_${boardName || "nombre-no-disponible"}.pdf`);
 
    document.body.removeChild(canvas);
  }

  const sendUpdateNotification = async (updateDetails) => {
    try {
      const response = await axios.post("http://localhost:3001/send-email", {
        to: "wernerchino@gmail.com",
        subject: "Actualización en el proyecto",
        text: `Se ha realizado la siguiente actualización:\n\n${updateDetails}`,
      });
  
      console.log("Correo enviado:", response.data.message)
    } catch (error) {
      console.error("Error al enviar la notificación:", error)
    }
  };
  
  
  return (
    <>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Button onClick={createSection}>
          Add section
        </Button>
        <Button onClick={handleDownloadPdf}>
          Descargar PDF
        </Button>
        <Typography variant='body2' fontWeight='700'>
          {data.length} Sections
        </Typography>
      </Box>
      <Divider sx={{ margin: '10px 0' }} />
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          width: 'calc(100vw - 400px)',
          overflowX: 'auto'
        }}>
          {
            data.map(section => (
              <div key={section.id} style={{ width: '300px' }}>
                <Droppable key={section.id} droppableId={section.id}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ width: '300px', padding: '10px', marginRight: '10px' }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}>
                        <TextField
                          value={section.title}
                          onChange={(e) => updateSectionTitle(e, section.id)}
                          placeholder='Untitled'
                          variant='outlined'
                          sx={{
                            flexGrow: 1,
                            '& .MuiOutlinedInput-input': { padding: 0 },
                            '& .MuiOutlinedInput-notchedOutline': { border: 'unset ' },
                            '& .MuiOutlinedInput-root': { fontSize: '1rem', fontWeight: '700' }
                          }}
                        />
                        <IconButton
                          variant='outlined'
                          size='small'
                          sx={{
                            color: 'gray',
                            '&:hover': { color: 'green' }
                          }}
                          onClick={() => createTask(section.id)}
                        >
                          <AddOutlinedIcon />
                        </IconButton>
                        <IconButton
                          variant='outlined'
                          size='small'
                          sx={{
                            color: 'gray',
                            '&:hover': { color: 'red' }
                          }}
                          onClick={() => deleteSection(section.id)}
                        >
                          <DeleteOutlinedIcon />
                        </IconButton>
                      </Box>
                      {/* tasks */}
                      {
                        section.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  padding: '10px',
                                  marginBottom: '10px',
                                  cursor: snapshot.isDragging ? 'grab' : 'pointer!important'
                                }}
                                onClick={() => setSelectedTask(task)}
                              >
                                <Typography>
                                  {task.title === '' ? 'Untitled' : task.title}
                                </Typography>
                              </Card>
                            )}
                          </Draggable>
                        ))
                      }
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </div>
            ))
          }
        </Box>
      </DragDropContext>
      <TaskModal
        task={selectedTask}
        boardId={boardId}
        onClose={() => setSelectedTask(undefined)}
        onUpdate={onUpdateTask}
        onDelete={onDeleteTask}
      />
    </>
  )
}

export default Kanban